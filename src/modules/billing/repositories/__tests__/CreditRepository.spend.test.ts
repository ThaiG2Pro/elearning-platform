import { describe, it, expect, vi } from 'vitest';
import { CreditRepository } from '../CreditRepository';

/**
 * Security regression — spendCredits phải trừ tiền bằng 1 câu UPDATE có
 * điều kiện `credit_balance >= amount` (DB quyết định), không phải
 * SELECT → kiểm tra trong JS → UPDATE (2 request song song cùng qua được).
 */
const makeTx = (balanceAfter: number, matched: number, alreadyRefunded = false) => ({
    users: {
        updateMany: vi.fn().mockResolvedValue({ count: matched }),
        update: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ credit_balance: balanceAfter }),
    },
    credit_transactions: {
        create: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn().mockResolvedValue(alreadyRefunded ? { id: BigInt(9) } : null),
    },
});

const makePrisma = (tx: ReturnType<typeof makeTx>) => ({
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
});

describe('CreditRepository.spendCredits', () => {
    it('trừ bằng updateMany có điều kiện gte và ghi ledger với balance_after từ DB', async () => {
        const tx = makeTx(7, 1);
        const repo = new CreditRepository(makePrisma(tx) as never);

        const result = await repo.spendCredits(BigInt(1), 3, BigInt(42));

        expect(result).toBe(7);
        expect(tx.users.updateMany).toHaveBeenCalledWith({
            where: { id: BigInt(1), credit_balance: { gte: 3 } },
            data: { credit_balance: { decrement: 3 } },
        });
        expect(tx.credit_transactions.create).toHaveBeenCalledWith({
            data: {
                user_id: BigInt(1),
                amount: -3,
                reason: 'AI_GENERATION_SPEND',
                ai_generation_id: BigInt(42),
                balance_after: 7,
            },
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

describe('CreditRepository.refundCredits', () => {
    it('hoàn 1 lần và ghi ledger REFUND gắn ai_generation_id', async () => {
        const tx = makeTx(5, 1);
        const repo = new CreditRepository(makePrisma(tx) as never);

        const result = await repo.refundCredits(BigInt(1), 3, BigInt(42));

        expect(result).toBe(8);
        expect(tx.users.update).toHaveBeenCalledWith({ where: { id: BigInt(1) }, data: { credit_balance: 8 } });
        expect(tx.credit_transactions.create).toHaveBeenCalledWith({
            data: { user_id: BigInt(1), amount: 3, reason: 'REFUND', ai_generation_id: BigInt(42), balance_after: 8 },
        });
    });

    it('idempotent: đã có REFUND cho cùng ai_generation_id thì không hoàn lần 2 (service + job đối soát cùng gọi)', async () => {
        const tx = makeTx(8, 1, true);
        const repo = new CreditRepository(makePrisma(tx) as never);

        const result = await repo.refundCredits(BigInt(1), 3, BigInt(42));

        expect(result).toBe(8);
        expect(tx.users.update).not.toHaveBeenCalled();
        expect(tx.credit_transactions.create).not.toHaveBeenCalled();
    });

    it('từ chối amount không hợp lệ trước khi chạm DB', async () => {
        const tx = makeTx(0, 1);
        const prisma = makePrisma(tx);
        const repo = new CreditRepository(prisma as never);

        await expect(repo.refundCredits(BigInt(1), 0)).rejects.toThrow('INVALID_CREDIT_AMOUNT');
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});

describe('CreditRepository.findUnrefundedSpends', () => {
    it('trả về lượt đã SPEND mà chưa có REFUND cùng ai_generation_id, amount dương', async () => {
        const prisma = {
            credit_transactions: {
                findMany: vi.fn().mockResolvedValue([
                    { ai_generation_id: BigInt(1), user_id: BigInt(7), amount: -1, reason: 'AI_GENERATION_SPEND' },
                    { ai_generation_id: BigInt(2), user_id: BigInt(7), amount: -1, reason: 'AI_GENERATION_SPEND' },
                    { ai_generation_id: BigInt(2), user_id: BigInt(7), amount: 1, reason: 'REFUND' },
                ]),
            },
        };
        const repo = new CreditRepository(prisma as never);

        const result = await repo.findUnrefundedSpends([BigInt(1), BigInt(2)]);

        expect([...result.keys()]).toEqual([BigInt(1)]);
        expect(result.get(BigInt(1))).toEqual({ userId: BigInt(7), amount: 1 });
    });

    it('danh sách rỗng thì không chạm DB', async () => {
        const prisma = { credit_transactions: { findMany: vi.fn() } };
        const repo = new CreditRepository(prisma as never);
        expect((await repo.findUnrefundedSpends([])).size).toBe(0);
        expect(prisma.credit_transactions.findMany).not.toHaveBeenCalled();
    });
});
