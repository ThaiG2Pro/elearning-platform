import { describe, it, expect } from 'vitest';
import { CreditLedger, CREDIT_PACKAGES, findCreditPackage } from '../CreditLedger';

describe('CreditLedger.balanceAfterPurchase', () => {
    it('adds package credits to the current balance', () => {
        expect(CreditLedger.balanceAfterPurchase(50, 120)).toBe(170);
    });

    it('works from a zero balance', () => {
        expect(CreditLedger.balanceAfterPurchase(0, 20)).toBe(20);
    });
});

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

describe('CreditLedger.balanceAfterRefund', () => {
    it('adds the refund back to the balance', () => {
        expect(CreditLedger.balanceAfterRefund(0, 10)).toBe(10);
    });
});

describe('CreditLedger.hasSufficientCredits', () => {
    it('true when balance >= cost', () => {
        expect(CreditLedger.hasSufficientCredits(10, 10)).toBe(true);
        expect(CreditLedger.hasSufficientCredits(11, 10)).toBe(true);
    });

    it('false when balance < cost', () => {
        expect(CreditLedger.hasSufficientCredits(9, 10)).toBe(false);
    });
});

describe('CREDIT_PACKAGES / findCreditPackage', () => {
    it('exposes at least one package with positive credits and price', () => {
        expect(CREDIT_PACKAGES.length).toBeGreaterThan(0);
        for (const pkg of CREDIT_PACKAGES) {
            expect(pkg.credits).toBeGreaterThan(0);
            expect(pkg.priceUsdCents).toBeGreaterThan(0);
        }
    });

    it('finds a known package by id', () => {
        expect(findCreditPackage('starter')).toBeDefined();
    });

    it('returns undefined for an unknown package id', () => {
        expect(findCreditPackage('does-not-exist')).toBeUndefined();
    });
});
