import { describe, it, expect } from 'vitest';
import { TokenPolicy } from '../TokenPolicy';
import { TokenEntity } from '../TokenEntity';

const future = new Date(Date.now() + 60_000);
const past   = new Date(Date.now() - 60_000);

const makeToken = (overrides: Partial<{ expiresAt: Date; isUsed: boolean; type: string }> = {}) =>
    new TokenEntity(1n, 1n, 'code', overrides.type ?? 'ACTIVATION', overrides.expiresAt ?? future, overrides.isUsed ?? false);

describe('TokenPolicy', () => {
    describe('validateActivationToken', () => {
        it('returns the token when valid', () => {
            const token = makeToken();
            expect(TokenPolicy.validateActivationToken(token)).toBe(token);
        });

        it('throws TOKEN_INVALID when token is null', () => {
            expect(() => TokenPolicy.validateActivationToken(null)).toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when token is already used', () => {
            const token = makeToken({ isUsed: true });
            expect(() => TokenPolicy.validateActivationToken(token)).toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID when token is expired', () => {
            const token = makeToken({ expiresAt: past });
            expect(() => TokenPolicy.validateActivationToken(token)).toThrow('TOKEN_INVALID');
        });

        it('throws TOKEN_INVALID for a RECOVERY-type token — reset codes must not activate accounts', () => {
            const token = makeToken({ type: 'RECOVERY' });
            expect(() => TokenPolicy.validateActivationToken(token)).toThrow('TOKEN_INVALID');
        });
    });
});
