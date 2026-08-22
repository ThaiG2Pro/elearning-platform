import { describe, it, expect, afterEach, vi } from 'vitest';
import { CreditLedger, findCreditPackage, aiGenerationCreditCost } from '../CreditLedger';

describe('CreditLedger.balanceAfterSpend', () => {
    it('subtracts the cost when balance is sufficient', () => {
        expect(CreditLedger.balanceAfterSpend(50, 10)).toBe(40);
    });

    it('allows spending down to exactly zero', () => {
        expect(CreditLedger.balanceAfterSpend(10, 10)).toBe(0);
    });

    it('throws AI_INSUFFICIENT_CREDITS instead of going negative', () => {
        expect(() => CreditLedger.balanceAfterSpend(5, 10)).toThrow('AI_INSUFFICIENT_CREDITS');
    });
});

// Hàng rào chống "in credit": mọi amount phải là số nguyên dương hữu hạn.
// spend với cost âm sẽ CỘNG tiền, purchase âm sẽ TRỪ tiền — cả hai đều phải
// bị chặn ở tầng domain trước khi chạm ledger.
describe('CreditLedger amount validation', () => {
    const invalidAmounts = [-5, 0, 1.5, NaN, Infinity, -Infinity];

    for (const amount of invalidAmounts) {
        it(`balanceAfterSpend rejects cost ${amount}`, () => {
            expect(() => CreditLedger.balanceAfterSpend(50, amount)).toThrow('INVALID_CREDIT_AMOUNT');
        });

        it(`balanceAfterPurchase rejects amount ${amount}`, () => {
            expect(() => CreditLedger.balanceAfterPurchase(50, amount)).toThrow('INVALID_CREDIT_AMOUNT');
        });

        it(`balanceAfterRefund rejects amount ${amount}`, () => {
            expect(() => CreditLedger.balanceAfterRefund(50, amount)).toThrow('INVALID_CREDIT_AMOUNT');
        });
    }
});

describe('aiGenerationCreditCost', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns the default 10 when env is unset', () => {
        vi.stubEnv('AI_GENERATION_CREDIT_COST', undefined as unknown as string);
        delete process.env.AI_GENERATION_CREDIT_COST;
        expect(aiGenerationCreditCost()).toBe(10);
    });

    it('parses a valid positive integer from env', () => {
        vi.stubEnv('AI_GENERATION_CREDIT_COST', '25');
        expect(aiGenerationCreditCost()).toBe(25);
    });

    // Env cấu hình sai không được phép biến generate thành miễn phí (0/NaN)
    // hay in credit (âm) — luôn rơi về mặc định 10.
    for (const bad of ['', 'abc', '-10', '0', '1.5']) {
        it(`falls back to 10 for malformed env value ${JSON.stringify(bad)}`, () => {
            vi.stubEnv('AI_GENERATION_CREDIT_COST', bad);
            expect(aiGenerationCreditCost()).toBe(10);
        });
    }
});

describe('findCreditPackage', () => {
    it('finds a known package by id', () => {
        expect(findCreditPackage('starter')).toBeDefined();
    });

    it('returns undefined for an unknown package id', () => {
        expect(findCreditPackage('does-not-exist')).toBeUndefined();
    });
});
