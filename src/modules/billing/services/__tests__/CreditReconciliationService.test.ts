import { describe, it, expect, vi } from 'vitest';
import { CreditReconciliationService } from '../CreditReconciliationService';

const since = new Date('2026-09-15T00:00:00Z');

const makeAiRepo = (rows: Array<{ id: bigint; userId: bigint | null; status: 'PENDING' | 'FAILED' }>) => ({
    findPaidGenerationsNeedingReconciliation: vi.fn().mockResolvedValue(rows),
    markFailed: vi.fn().mockResolvedValue(undefined),
});

const makeCreditRepo = (
    debts: Array<[bigint, { userId: bigint; amount: number }]>,
    mismatches: Array<{ userId: bigint; balance: number; ledgerSum: number }> = [],
) => ({
    findUnrefundedSpends: vi.fn().mockResolvedValue(new Map(debts)),
    refundCredits: vi.fn().mockResolvedValue(1),
    findBalanceMismatches: vi.fn().mockResolvedValue(mismatches),
});

describe('CreditReconciliationService.reconcile', () => {
    it('đánh FAILED row PENDING mồ côi và hoàn credit cho lượt đã trừ chưa hoàn', async () => {
        const aiRepo = makeAiRepo([
            { id: 1n, userId: 7n, status: 'PENDING' },
            { id: 2n, userId: 7n, status: 'FAILED' },
        ]);
        const creditRepo = makeCreditRepo([
            [1n, { userId: 7n, amount: 1 }],
            [2n, { userId: 7n, amount: 1 }],
        ]);
        const service = new CreditReconciliationService(aiRepo, creditRepo);

        const result = await service.reconcile(since);

        expect(aiRepo.findPaidGenerationsNeedingReconciliation).toHaveBeenCalledWith(since);
        expect(aiRepo.markFailed).toHaveBeenCalledTimes(1);
        expect(aiRepo.markFailed).toHaveBeenCalledWith(1n, 'ORPHANED_PENDING_TIMEOUT');
        expect(creditRepo.refundCredits).toHaveBeenCalledTimes(2);
        expect(creditRepo.refundCredits).toHaveBeenCalledWith(7n, 1, 1n);
        expect(creditRepo.refundCredits).toHaveBeenCalledWith(7n, 1, 2n);
        expect(result.orphanedMarkedFailed).toEqual([1n]);
        expect(result.refunded).toHaveLength(2);
    });

    it('row FAILED đã được hoàn (không còn nợ trong ledger) thì không hoàn lần 2', async () => {
        const aiRepo = makeAiRepo([{ id: 2n, userId: 7n, status: 'FAILED' }]);
        const creditRepo = makeCreditRepo([]);
        const service = new CreditReconciliationService(aiRepo, creditRepo);

        const result = await service.reconcile(since);

        expect(creditRepo.refundCredits).not.toHaveBeenCalled();
        expect(result.refunded).toEqual([]);
    });

    it('dryRun chỉ báo cáo, không ghi gì', async () => {
        const aiRepo = makeAiRepo([{ id: 1n, userId: 7n, status: 'PENDING' }]);
        const creditRepo = makeCreditRepo([[1n, { userId: 7n, amount: 1 }]]);
        const service = new CreditReconciliationService(aiRepo, creditRepo);

        const result = await service.reconcile(since, { dryRun: true });

        expect(aiRepo.markFailed).not.toHaveBeenCalled();
        expect(creditRepo.refundCredits).not.toHaveBeenCalled();
        expect(result.orphanedMarkedFailed).toEqual([1n]);
        expect(result.refunded).toHaveLength(1);
    });

    it('không có ứng viên thì không hỏi ledger, nhưng vẫn kiểm tra toàn vẹn sổ cái', async () => {
        const aiRepo = makeAiRepo([]);
        const creditRepo = makeCreditRepo([]);
        await new CreditReconciliationService(aiRepo, creditRepo).reconcile(since);
        expect(creditRepo.findUnrefundedSpends).not.toHaveBeenCalled();
        expect(creditRepo.findBalanceMismatches).toHaveBeenCalledTimes(1);
    });

    it('sổ cái lệch số dư → báo trong kết quả và gửi cảnh báo, KHÔNG tự sửa', async () => {
        const aiRepo = makeAiRepo([]);
        const creditRepo = makeCreditRepo([], [{ userId: 9n, balance: 5, ledgerSum: 7 }]);
        const alert = vi.fn().mockResolvedValue(undefined);
        const service = new CreditReconciliationService(aiRepo, creditRepo, alert);

        const result = await service.reconcile(since);

        expect(result.balanceMismatches).toEqual([{ userId: 9n, balance: 5, ledgerSum: 7 }]);
        expect(alert).toHaveBeenCalledTimes(1);
        expect(creditRepo.refundCredits).not.toHaveBeenCalled();
    });

    it('có hoàn bù → gửi cảnh báo 1 lần; dryRun và không phát hiện gì → không cảnh báo', async () => {
        const alert = vi.fn().mockResolvedValue(undefined);
        await new CreditReconciliationService(
            makeAiRepo([{ id: 1n, userId: 7n, status: 'FAILED' }]),
            makeCreditRepo([[1n, { userId: 7n, amount: 1 }]]),
            alert,
        ).reconcile(since);
        expect(alert).toHaveBeenCalledTimes(1);

        alert.mockClear();
        await new CreditReconciliationService(
            makeAiRepo([{ id: 1n, userId: 7n, status: 'FAILED' }]),
            makeCreditRepo([[1n, { userId: 7n, amount: 1 }]]),
            alert,
        ).reconcile(since, { dryRun: true });
        expect(alert).not.toHaveBeenCalled();

        await new CreditReconciliationService(makeAiRepo([]), makeCreditRepo([]), alert).reconcile(since);
        expect(alert).not.toHaveBeenCalled();
    });
});
