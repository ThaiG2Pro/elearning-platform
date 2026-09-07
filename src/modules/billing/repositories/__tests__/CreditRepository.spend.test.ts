import { describe, it, expect, vi } from 'vitest';
import { CreditRepository } from '../CreditRepository';

/**
 * Security regression — spendCredits phải trừ tiền bằng 1 câu UPDATE có
 * điều kiện `credit_balance >= amount` (DB quyết định), không phải
 * SELECT → kiểm tra trong JS → UPDATE (2 request song song cùng qua được).
 */
const makeTx = (balanceAfter: number, matched: number) => ({
    users: {
        updateMany: vi.fn().mockResolvedValue({ count: matched }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ credit_balance: balanceAfter }),
    },
    credit_transactions: { create: vi.fn().mockResolvedValue({}) },
});

const makePrisma = (tx: ReturnType<typeof makeTx>) => ({
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
});

describe('CreditRepository.spendCredits', () => {
    it('trừ bằng updateMany có điều kiện gte và ghi ledger với balance_after từ DB', async () => {
        const tx = makeTx(7, 1);
        const repo = new CreditRepository(makePrisma(tx) as never);

        const result = await repo.spendCredits(BigInt(1), 3);

        expect(result).toBe(7);
        expect(tx.users.updateMany).toHaveBeenCalledWith({
            where: { id: BigInt(1), credit_balance: { gte: 3 } },
            data: { credit_balance: { decrement: 3 } },
        });
        expect(tx.credit_transactions.create).toHaveBeenCalledWith({
            data: { user_id: BigInt(1), amount: -3, reason: 'AI_GENERATION_SPEND', balance_after: 7 },
        });
    });

    it('throw AI_INSUFFICIENT_CREDITS khi UPDATE không khớp row (số dư không đủ), không ghi ledger', async () => {
        const tx = makeTx(0, 0);
        const repo = new CreditRepository(makePrisma(tx) as never);

        await expect(repo.spendCredits(BigInt(1), 3)).rejects.toThrow('AI_INSUFFICIENT_CREDITS');
        expect(tx.credit_transactions.create).not.toHaveBeenCalled();
    });

    it('từ chối amount không hợp lệ trước khi chạm DB', async () => {
        const tx = makeTx(0, 1);
        const prisma = makePrisma(tx);
        const repo = new CreditRepository(prisma as never);

        await expect(repo.spendCredits(BigInt(1), -5)).rejects.toThrow('INVALID_CREDIT_AMOUNT');
        await expect(repo.spendCredits(BigInt(1), 1.5)).rejects.toThrow('INVALID_CREDIT_AMOUNT');
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
