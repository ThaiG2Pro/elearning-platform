import { PrismaClient } from '@prisma/client';
import { AIGenerationRepository } from '../src/modules/ai-generation/repositories/AIGenerationRepository';
import { CreditRepository } from '../src/modules/billing/repositories/CreditRepository';
import { CreditReconciliationService } from '../src/modules/billing/services/CreditReconciliationService';
import { sendOpsAlert } from '../src/shared/ops/alert';

/**
 * 2026-09-15 — đối soát credit: hoàn bù lượt PAID_TIER đã trừ mà không bao
 * giờ thành READY (xem CreditReconciliationService). Mặc định DRY-RUN, in ra
 * sẽ làm gì; `pnpm credits:reconcile -- --apply` để thực sự hoàn.
 *
 * Nên chạy định kỳ (cron mỗi 15–30 phút trên VPS). Cửa sổ PENDING mồ côi
 * lấy từ AI_IN_FLIGHT_WINDOW_MS (mặc định 5 phút) — bằng đúng cửa sổ dedup
 * ở AIGenerationService, để không đánh FAILED 1 lượt còn đang chạy thật.
 */
const prisma = new PrismaClient();

function inFlightWindowMs(): number {
    const parsed = Number(process.env.AI_IN_FLIGHT_WINDOW_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60_000;
}

async function main() {
    const apply = process.argv.includes('--apply');
    const service = new CreditReconciliationService(
        new AIGenerationRepository(prisma),
        new CreditRepository(prisma),
        sendOpsAlert,
    );
    const result = await service.reconcile(new Date(Date.now() - inFlightWindowMs()), { dryRun: !apply });

    console.log(apply ? 'APPLY' : 'DRY-RUN (thêm --apply để thực hiện)');
    console.log(`PENDING mồ côi → FAILED: ${result.orphanedMarkedFailed.length}`);
    for (const id of result.orphanedMarkedFailed) console.log(`  ai_generation #${id}`);
    console.log(`Hoàn credit: ${result.refunded.length}`);
    for (const r of result.refunded) {
        console.log(`  ai_generation #${r.aiGenerationId} → user #${r.userId} +${r.amount} credit`);
    }
    console.log(`Sổ cái lệch số dư: ${result.balanceMismatches.length}`);
    for (const m of result.balanceMismatches) {
        console.log(`  user #${m.userId}: credit_balance=${m.balance}, SUM(ledger)=${m.ledgerSum} — KHÔNG tự sửa, cần xem tay`);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
