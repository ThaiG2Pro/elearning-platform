import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { TokenFactory } from '../TokenFactory';
import { UserEntity } from '../UserEntity';

// Hàng rào cho vòng refresh-token: claim ký ra phải đọc lại được (đã từng lệch
// `id` vs `userId` khiến /auth/refresh luôn trả 401), và verifier phải chặn
// access token lẫn token ký sai secret.

const makeUser = () =>
    new UserEntity(42n, 'user@example.com', 'hash', 'ACTIVE', 'STUDENT', 'Người Dùng', 20);

describe('TokenFactory refresh flow', () => {
    beforeEach(() => {
        vi.stubEnv('JWT_SECRET', 'test-secret-for-token-factory');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('round-trips: verifyRefreshToken accepts its own refreshToken and returns the user id', () => {
        const { refreshToken } = TokenFactory.createAuthTokens(makeUser());
        const decoded = TokenFactory.verifyRefreshToken(refreshToken);
        expect(decoded).not.toBeNull();
        expect(decoded!.userId).toBe(42n);
    });

    it('rejects an access token passed as a refresh token', () => {
        const { accessToken } = TokenFactory.createAuthTokens(makeUser());
        expect(TokenFactory.verifyRefreshToken(accessToken)).toBeNull();
    });

    it('rejects a refresh token signed with a different secret', () => {
        const forged = jwt.sign(
            { id: '42', role: 'ADMIN', type: 'refresh' },
            'wrong-secret',
            { expiresIn: '7d' },
        );
        expect(TokenFactory.verifyRefreshToken(forged)).toBeNull();
    });
});
