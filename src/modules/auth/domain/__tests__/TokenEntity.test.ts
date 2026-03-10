import { describe, it, expect } from 'vitest';
import { TokenEntity } from '../TokenEntity';

const future = new Date(Date.now() + 60_000);
const past   = new Date(Date.now() - 60_000);

const makeToken = (overrides: Partial<{ expiresAt: Date; isUsed: boolean }> = {}) =>
    new TokenEntity(1n, 1n, 'uuid-code', 'ACTIVATION', overrides.expiresAt ?? future, overrides.isUsed ?? false);

describe('TokenEntity', () => {
    describe('isExpired', () => {
        it('returns false for a future expiry date', () => {
            expect(makeToken({ expiresAt: future }).isExpired()).toBe(false);
        });

        it('returns true for a past expiry date', () => {
            expect(makeToken({ expiresAt: past }).isExpired()).toBe(true);
        });
    });

    describe('isUsedToken', () => {
        it('returns false when not used', () => {
            expect(makeToken({ isUsed: false }).isUsedToken()).toBe(false);
        });

        it('returns true when used', () => {
            expect(makeToken({ isUsed: true }).isUsedToken()).toBe(true);
        });
    });

    describe('markAsUsed', () => {
        it('sets isUsed to true', () => {
            const token = makeToken({ isUsed: false });
            token.markAsUsed();
            expect(token.isUsed).toBe(true);
        });
    });
});
