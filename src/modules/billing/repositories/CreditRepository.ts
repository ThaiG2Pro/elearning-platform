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

    /** Tiêu credit cho 1 lần generate PAID_TIER — throw nếu không đủ số dư. */
    async spendCredits(userId: bigint, amount: number): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.users.findUniqueOrThrow({
                where: { id: userId },
                select: { credit_balance: true },
            });
            const newBalance = CreditLedger.balanceAfterSpend(user.credit_balance, amount);
            await tx.users.update({ where: { id: userId }, data: { credit_balance: newBalance } });
            await tx.credit_transactions.create({
                data: {
                    user_id: userId,
                    amount: -amount,
                    reason: 'AI_GENERATION_SPEND',
                    balance_after: newBalance,
                },
            });
            return newBalance;
        });
    }

    /** Hoàn credit khi generate PAID_TIER thất bại sau khi đã trừ tiền. */
    async refundCredits(userId: bigint, amount: number): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.users.findUniqueOrThrow({
                where: { id: userId },
                select: { credit_balance: true },
            });
            const newBalance = CreditLedger.balanceAfterRefund(user.credit_balance, amount);
            await tx.users.update({ where: { id: userId }, data: { credit_balance: newBalance } });
            await tx.credit_transactions.create({
                data: { user_id: userId, amount, reason: 'REFUND', balance_after: newBalance },
            });
            return newBalance;
        });
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
