import { AIGenerationRepository } from '../../ai-generation/repositories/AIGenerationRepository';
import { CreditRepository } from '../repositories/CreditRepository';

export interface ReconciliationResult {
    /** Row PENDING mồ côi đã bị đánh FAILED (process chết giữa lúc await LLM). */
    orphanedMarkedFailed: bigint[];
    /** Lượt đã trừ credit mà chưa hoàn → đã hoàn bù. */
    refunded: Array<{ aiGenerationId: bigint; userId: bigint; amount: number }>;
    /** users.credit_balance ≠ SUM(ledger) — chỉ báo, không tự sửa. */
    balanceMismatches: Array<{ userId: bigint; balance: number; ledgerSum: number }>;
}

export type OpsAlert = (title: string, details?: Record<string, unknown>) => Promise<void>;

/**
 * 2026-09-15 — lớp bảo hiểm thứ 2 cho luồng trừ credit (lớp 1 là try/catch
 * hoàn ngay trong AIGenerationService.generate). Bắt 3 tình huống lớp 1
 * không thể tự xử lý:
 *
 *   1. Process bị cắt giữa lúc await LLM (serverless timeout, crash, deploy):
 *      credit đã trừ, row kẹt PENDING mãi, không ai hoàn.
 *   2. LLM lỗi, markFailed xong nhưng refundCredits lỗi (DB chập chờn):
 *      row FAILED, ledger có SPEND không có REFUND.
 *   3. Refund đã chạy nhưng response chưa về, user thấy lỗi — không sao,
 *      refundCredits idempotent theo ai_generation_id nên chạy lại vô hại.
 *
 * Quy tắc duy nhất: row PAID_TIER ở trạng thái không thể thành READY nữa
 * (FAILED, hoặc PENDING quá cửa sổ in-flight) mà ledger có SPEND chưa có
 * REFUND cho đúng id đó → hoàn. Không đoán từ số dư, không hoàn theo user.
 *
 * Chạy định kỳ qua `pnpm credits:reconcile` (scripts/reconcileCredits.ts).
 * Pure orchestration — không chạm Prisma trực tiếp, test được bằng mock 2 repo.
 */
export class CreditReconciliationService {
    constructor(
        private aiRepo: Pick<AIGenerationRepository, 'findPaidGenerationsNeedingReconciliation' | 'markFailed'>,
        private creditRepo: Pick<CreditRepository, 'findUnrefundedSpends' | 'refundCredits' | 'findBalanceMismatches'>,
        /** 2026-09-15 — mọi phát hiện đều phải có người nhìn: bình thường job này KHÔNG tìm thấy gì. */
        private alert: OpsAlert = async () => {},
    ) { }

    async reconcile(pendingOlderThan: Date, options: { dryRun?: boolean } = {}): Promise<ReconciliationResult> {
        const result: ReconciliationResult = { orphanedMarkedFailed: [], refunded: [], balanceMismatches: [] };
        await this.reconcileOrphanedSpends(pendingOlderThan, options, result);

        // Kiểm tra toàn vẹn sổ cái SAU khi đã hoàn bù, để không báo lệch giả
        // do chính các khoản vừa hoàn ở trên.
        result.balanceMismatches = await this.creditRepo.findBalanceMismatches();

        const found = result.orphanedMarkedFailed.length + result.refunded.length + result.balanceMismatches.length;
        if (found > 0 && !options.dryRun) {
            await this.alert('Đối soát credit có phát hiện', {
                orphanedMarkedFailed: result.orphanedMarkedFailed.map(String),
                refunded: result.refunded.map((r) => ({ aiGenerationId: r.aiGenerationId.toString(), userId: r.userId.toString(), amount: r.amount })),
                balanceMismatches: result.balanceMismatches.map((m) => ({ userId: m.userId.toString(), balance: m.balance, ledgerSum: m.ledgerSum })),
            });
        }
        return result;
    }

    private async reconcileOrphanedSpends(
        pendingOlderThan: Date,
        options: { dryRun?: boolean },
        result: ReconciliationResult,
    ): Promise<void> {
        const candidates = await this.aiRepo.findPaidGenerationsNeedingReconciliation(pendingOlderThan);
        if (candidates.length === 0) return;

        const unrefunded = await this.creditRepo.findUnrefundedSpends(candidates.map((c) => c.id));

        for (const row of candidates) {
            if (row.status === 'PENDING') {
                result.orphanedMarkedFailed.push(row.id);
                if (!options.dryRun) {
                    await this.aiRepo.markFailed(row.id, 'ORPHANED_PENDING_TIMEOUT');
                }
            }
            const debt = unrefunded.get(row.id);
            if (!debt) continue;
            result.refunded.push({ aiGenerationId: row.id, userId: debt.userId, amount: debt.amount });
            if (!options.dryRun) {
                await this.creditRepo.refundCredits(debt.userId, debt.amount, row.id);
            }
        }
    }
}
