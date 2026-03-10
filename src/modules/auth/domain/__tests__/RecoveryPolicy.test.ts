import { describe, it, expect } from 'vitest';
import { RecoveryPolicy } from '../RecoveryPolicy';
import { TokenEntity } from '../TokenEntity';

const future = new Date(Date.now() + 60_000);
const past   = new Date(Date.now() - 60_000);

const makeToken = (overrides: Partial<{ expiresAt: Date; isUsed: boolean }> = {}) =>
    new TokenEntity(1n, 1n, 'code', 'RECOVERY', overrides.expiresAt ?? future, overrides.isUsed ?? false);

describe('RecoveryPolicy', () => {
    describe('validateRecoveryToken', () => {
        it('returns the token when valid', () => {
            const token = makeToken();
            expect(RecoveryPolicy.validateRecoveryToken(token)).toBe(token);
        });

        it('throws TOKEN_INVALID when null', () => {
            expect(() => RecoveryPolicy.validateRecoveryToken(null)).toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when already used', () => {
            expect(() => RecoveryPolicy.validateRecoveryToken(makeToken({ isUsed: true }))).toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when expired', () => {
            expect(() => RecoveryPolicy.validateRecoveryToken(makeToken({ expiresAt: past }))).toThrow('TOKEN_INVALID');
        });
    });
});
