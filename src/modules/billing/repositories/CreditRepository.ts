import { Prisma, PrismaClient } from '@prisma/client';
import { CreditLedger, CreditTransactionReason } from '../domain/CreditLedger';

/**
 * WP4.1 (Checkpoint 4) — mọi thay đổi credit_balance đi qua đây, luôn kèm 1
 * dòng credit_transactions cùng transaction DB (nguồn sự thật audit lại
 * được số dư). `spendCredits`/`addCredits` dùng `prisma.$transaction`
 * interactive để đọc-rồi-ghi trong cùng 1 transaction — chống race 2 request
 * đồng thời cùng tiêu/cùng cộng credit cho 1 user (Postgres serializes ghi
 * trên cùng row qua row lock ngầm của UPDATE).
 */
export class CreditRepository {
    constructor(private prisma: PrismaClient) { }

    async getBalance(userId: bigint): Promise<number> {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            select: { credit_balance: true },
        });
        return user?.credit_balance ?? 0;
    }

    /**
     * Mua credit — idempotent theo `stripeReference` (session/payment_intent
     * id): Stripe có thể gửi trùng cùng 1 webhook event nhiều lần (retry),
     * unique index ở migration bắt P2002 nếu đã xử lý event này rồi.
     */
    async addCredits(
        userId: bigint,
        amount: number,
        reason: CreditTransactionReason,
        stripeReference?: string,
        /** 2026-09-15 — PaymentIntent id, để refund/dispute nối ngược về gói này. */
        stripePaymentIntent?: string | null,
    ): Promise<number> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const user = await tx.users.findUniqueOrThrow({
                    where: { id: userId },
                    select: { credit_balance: true },
                });
                const newBalance = CreditLedger.balanceAfterPurchase(user.credit_balance, amount);
                await tx.users.update({ where: { id: userId }, data: { credit_balance: newBalance } });
                await tx.credit_transactions.create({
                    data: {
                        user_id: userId,
                        amount,
                        reason,
                        stripe_reference: stripeReference,
                        stripe_payment_intent: stripePaymentIntent ?? undefined,
                        balance_after: newBalance,
                    },
                });
                return newBalance;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Webhook đã xử lý event này trước đó — trả lại số dư hiện
                // tại, không cộng trùng lần thứ 2 (mục 6.2 tinh thần: không
                // âm thầm double-credit khi Stripe retry).
                return this.getBalance(userId);
            }
            throw error;
        }
    }

    /**
     * Tiêu credit cho 1 lần generate PAID_TIER — throw AI_INSUFFICIENT_CREDITS
     * nếu không đủ số dư.
     *
     * Security fix (race condition): bản cũ đọc credit_balance bằng SELECT,
     * kiểm tra trong JS rồi UPDATE giá trị đã tính sẵn. Prisma interactive
     * transaction chạy ở READ COMMITTED nên 2 request song song cùng đọc số
     * dư cũ, cùng qua bước kiểm tra, cùng ghi → trừ 2 lần / âm số dư. Giờ
     * điều kiện `credit_balance >= amount` nằm ngay trong câu UPDATE: Postgres
     * khoá row và đánh giá lại WHERE sau khi transaction trước commit, nên chỉ
     * đúng 1 request qua được khi số dư chỉ đủ cho 1 lần.
     */
    async spendCredits(userId: bigint, amount: number, aiGenerationId?: bigint): Promise<number> {
        CreditLedger.assertValidAmount(amount);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.users.updateMany({
                where: { id: userId, credit_balance: { gte: amount } },
                data: { credit_balance: { decrement: amount } },
            });
            if (updated.count === 0) {
                // Không phân biệt user không tồn tại vs không đủ tiền: caller
                // đã xác thực userId từ JWT nên trường hợp 1 không xảy ra.
                throw new Error('AI_INSUFFICIENT_CREDITS');
            }
            const user = await tx.users.findUniqueOrThrow({
                where: { id: userId },
                select: { credit_balance: true },
            });
            await tx.credit_transactions.create({
                data: {
                    user_id: userId,
                    amount: -amount,
                    reason: 'AI_GENERATION_SPEND',
                    ai_generation_id: aiGenerationId,
                    balance_after: user.credit_balance,
                },
            });
            return user.credit_balance;
        });
    }

    /**
     * Hoàn credit khi generate PAID_TIER thất bại sau khi đã trừ tiền.
     *
     * Idempotent theo `aiGenerationId`: 1 lượt chỉ được hoàn đúng 1 lần dù
     * service lẫn job đối soát cùng gọi (service hoàn xong nhưng response
     * chưa kịp về, job chạy sau thấy row FAILED lại hoàn nữa = in credit).
     * Kiểm tra "đã có REFUND cho id này chưa" nằm trong cùng transaction với
     * UPDATE số dư; 2 refund song song cho cùng id thì cái sau sẽ đọc thấy
     * dòng REFUND của cái trước sau khi row users được mở khoá.
     */
    async refundCredits(userId: bigint, amount: number, aiGenerationId?: bigint): Promise<number> {
        CreditLedger.assertValidAmount(amount);
        try {
            return await this.refundCreditsTx(userId, amount, aiGenerationId);
        } catch (error) {
            // 2026-09-15 — partial unique index (REFUND, ai_generation_id):
            // DB là hàng rào cuối, app kiểm tra ở trên chỉ là đường tắt.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return this.getBalance(userId);
            }
            throw error;
        }
    }

    private refundCreditsTx(userId: bigint, amount: number, aiGenerationId?: bigint): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            // Khoá row users trước (UPDATE no-op) để serialize 2 refund cùng
            // user, rồi mới kiểm tra đã hoàn chưa.
            await tx.users.updateMany({ where: { id: userId }, data: { credit_balance: { increment: 0 } } });
            if (aiGenerationId !== undefined) {
                const already = await tx.credit_transactions.findFirst({
                    where: { ai_generation_id: aiGenerationId, reason: 'REFUND' },
                    select: { id: true },
                });
                if (already) {
                    const current = await tx.users.findUniqueOrThrow({
                        where: { id: userId },
                        select: { credit_balance: true },
                    });
                    return current.credit_balance;
                }
            }
            const user = await tx.users.findUniqueOrThrow({
                where: { id: userId },
                select: { credit_balance: true },
            });
            const newBalance = CreditLedger.balanceAfterRefund(user.credit_balance, amount);
            await tx.users.update({ where: { id: userId }, data: { credit_balance: newBalance } });
            await tx.credit_transactions.create({
                data: {
                    user_id: userId,
                    amount,
                    reason: 'REFUND',
                    ai_generation_id: aiGenerationId,
                    balance_after: newBalance,
                },
            });
            return newBalance;
        });
    }

    /**
     * Đối soát: các lượt PAID_TIER đã trừ credit nhưng chưa có dòng REFUND
     * tương ứng, trong số các `generationIds` truyền vào (job đối soát chọn
     * trước những row FAILED / PENDING mồ côi rồi hỏi ở đây lượt nào còn
     * "nợ"). Trả về (generationId → { userId, amount }) với amount dương.
     */
    async findUnrefundedSpends(
        generationIds: bigint[],
    ): Promise<Map<bigint, { userId: bigint; amount: number }>> {
        const result = new Map<bigint, { userId: bigint; amount: number }>();
        if (generationIds.length === 0) return result;
        const rows = await this.prisma.credit_transactions.findMany({
            where: {
                ai_generation_id: { in: generationIds },
                reason: { in: ['AI_GENERATION_SPEND', 'REFUND'] },
            },
            select: { ai_generation_id: true, user_id: true, amount: true, reason: true },
        });
        const refunded = new Set<bigint>();
        for (const row of rows) {
            if (row.reason === 'REFUND' && row.ai_generation_id !== null) refunded.add(row.ai_generation_id);
        }
        for (const row of rows) {
            if (row.reason !== 'AI_GENERATION_SPEND' || row.ai_generation_id === null) continue;
            if (refunded.has(row.ai_generation_id)) continue;
            result.set(row.ai_generation_id, { userId: row.user_id, amount: -row.amount });
        }
        return result;
    }

    /**
     * 2026-09-15 — dòng PURCHASE ứng với 1 PaymentIntent (nối ngược từ event
     * charge.refunded / charge.dispute.*). `amount` = số credit đã cộng.
     */
    async findPurchaseByPaymentIntent(
        paymentIntentId: string,
    ): Promise<{ userId: bigint; credits: number; stripeReference: string | null } | null> {
        const row = await this.prisma.credit_transactions.findFirst({
            where: { stripe_payment_intent: paymentIntentId, reason: 'PURCHASE' },
            select: { user_id: true, amount: true, stripe_reference: true },
        });
        return row ? { userId: row.user_id, credits: row.amount, stripeReference: row.stripe_reference } : null;
    }

    /**
     * 2026-09-15 — điều chỉnh số dư do sự kiện Stripe (hoàn tiền, tranh chấp,
     * thắng tranh chấp). `delta` âm = thu hồi, dương = trả lại. Thu hồi ĐƯỢC
     * PHÉP đưa số dư xuống âm: khách đã tiêu rồi mới đòi tiền lại thì phần
     * âm là nợ, spendCredits (WHERE balance >= cost) tự chặn tiêu tiếp.
     * Idempotent theo `stripeReference` (refund id / dispute id) — Stripe
     * retry không thu hồi 2 lần.
     */
    async adjustCreditsForStripeEvent(
        userId: bigint,
        delta: number,
        reason: 'STRIPE_REFUND_CLAWBACK' | 'DISPUTE_CLAWBACK' | 'DISPUTE_WON_RESTORE',
        stripeReference: string,
        /** PaymentIntent của gói bị điều chỉnh — để cộng dồn mọi điều chỉnh Stripe của cùng 1 gói. */
        stripePaymentIntent?: string | null,
    ): Promise<number> {
        if (!Number.isInteger(delta) || delta === 0) {
            throw new Error('INVALID_CREDIT_AMOUNT');
        }
        try {
            return await this.prisma.$transaction(async (tx) => {
                const user = await tx.users.update({
                    where: { id: userId },
                    data: { credit_balance: { increment: delta } },
                    select: { credit_balance: true },
                });
                await tx.credit_transactions.create({
                    data: {
                        user_id: userId,
                        amount: delta,
                        reason,
                        stripe_reference: stripeReference,
                        stripe_payment_intent: stripePaymentIntent ?? undefined,
                        balance_after: user.credit_balance,
                    },
                });
                return user.credit_balance;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return this.getBalance(userId);
            }
            throw error;
        }
    }

    /**
     * Tổng điều chỉnh Stripe đã áp cho 1 gói (âm = đã thu hồi ròng, sau khi
     * trừ phần đã trả lại vì thắng tranh chấp). Dùng để mọi lần thu hồi tiếp
     * theo chỉ lấy PHẦN CHÊNH so với mục tiêu cộng dồn — không bao giờ thu
     * hồi trùng hay vượt số credit gói, dù Stripe bắn refund từng phần nhiều
     * lần hay refund chồng lên dispute.
     */
    async sumStripeAdjustmentsForPurchase(paymentIntentId: string): Promise<number> {
        const agg = await this.prisma.credit_transactions.aggregate({
            where: {
                stripe_payment_intent: paymentIntentId,
                reason: { in: ['STRIPE_REFUND_CLAWBACK', 'DISPUTE_CLAWBACK', 'DISPUTE_WON_RESTORE'] },
            },
            _sum: { amount: true },
        });
        return agg._sum.amount ?? 0;
    }

    /** Dòng ledger theo stripe_reference (refund id / dispute id) — null nếu chưa có. */
    async findByStripeReference(stripeReference: string): Promise<{ userId: bigint; amount: number } | null> {
        const row = await this.prisma.credit_transactions.findUnique({
            where: { stripe_reference: stripeReference },
            select: { user_id: true, amount: true },
        });
        return row ? { userId: row.user_id, amount: row.amount } : null;
    }

    /**
     * 2026-09-15 — điều chỉnh tay của người vận hành (scripts/creditAdjust.ts).
     * Đường DUY NHẤT hợp lệ để sửa số dư ngoài luồng nghiệp vụ: bắt buộc có
     * note, ghi vào ledger, được phép âm (ghi nợ). Không idempotent — mỗi lần
     * chạy là 1 quyết định riêng của người vận hành.
     */
    async adjustCreditsManually(userId: bigint, delta: number, note: string): Promise<number> {
        if (!Number.isInteger(delta) || delta === 0) {
            throw new Error('INVALID_CREDIT_AMOUNT');
        }
        if (!note.trim()) {
            throw new Error('MANUAL_ADJUSTMENT_NOTE_REQUIRED');
        }
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.users.update({
                where: { id: userId },
                data: { credit_balance: { increment: delta } },
                select: { credit_balance: true },
            });
            await tx.credit_transactions.create({
                data: {
                    user_id: userId,
                    amount: delta,
                    reason: 'MANUAL_ADJUSTMENT',
                    note: note.trim().slice(0, 500),
                    balance_after: user.credit_balance,
                },
            });
            return user.credit_balance;
        });
    }

    /**
     * Lịch sử giao dịch của 1 user, mới nhất trước, phân trang theo id
     * (cursor = id của dòng cuối trang trước). Nguồn cho trang /billing.
     */
    async listTransactions(
        userId: bigint,
        limit = 20,
        cursor?: bigint,
    ): Promise<Array<{
        id: bigint;
        amount: number;
        reason: CreditTransactionReason;
        balanceAfter: number;
        createdAt: Date;
        aiGenerationId: bigint | null;
        note: string | null;
    }>> {
        const rows = await this.prisma.credit_transactions.findMany({
            where: { user_id: userId, ...(cursor !== undefined ? { id: { lt: cursor } } : {}) },
            orderBy: { id: 'desc' },
            take: limit,
            select: { id: true, amount: true, reason: true, balance_after: true, created_at: true, ai_generation_id: true, note: true },
        });
        return rows.map((r) => ({
            id: r.id,
            amount: r.amount,
            reason: r.reason as CreditTransactionReason,
            balanceAfter: r.balance_after,
            createdAt: r.created_at,
            aiGenerationId: r.ai_generation_id,
            note: r.note,
        }));
    }

    /**
     * 2026-09-15 — kiểm tra toàn vẹn sổ cái: `users.credit_balance` phải bằng
     * SUM(credit_transactions.amount) của user đó. Lệch = có đường ghi số dư
     * không qua ledger (bug) hoặc ledger mất dòng. Chỉ BÁO, không tự sửa —
     * sửa số dư mà không hiểu nguyên nhân là xoá dấu vết.
     */
    async findBalanceMismatches(): Promise<Array<{ userId: bigint; balance: number; ledgerSum: number }>> {
        const rows = await this.prisma.$queryRaw<Array<{ user_id: bigint; credit_balance: number; ledger_sum: bigint | number }>>`
            SELECT u.id AS user_id, u.credit_balance, COALESCE(SUM(t.amount), 0) AS ledger_sum
            FROM users u
            LEFT JOIN credit_transactions t ON t.user_id = u.id
            GROUP BY u.id, u.credit_balance
            HAVING u.credit_balance <> COALESCE(SUM(t.amount), 0)
        `;
        return rows.map((r) => ({ userId: r.user_id, balance: r.credit_balance, ledgerSum: Number(r.ledger_sum) }));
    }

    async findUserIdByStripeCustomerId(stripeCustomerId: string): Promise<bigint | null> {
        const user = await this.prisma.users.findUnique({
            where: { stripe_customer_id: stripeCustomerId },
            select: { id: true },
        });
        return user?.id ?? null;
    }

    async ensureStripeCustomerId(userId: bigint, stripeCustomerId: string): Promise<void> {
        await this.prisma.users.update({ where: { id: userId }, data: { stripe_customer_id: stripeCustomerId } });
    }
}
