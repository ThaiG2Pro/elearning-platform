import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getRequestContext } from '../auth';

function requestWithBearer(token: string): NextRequest {
    return new NextRequest('http://localhost/api/v1/test', {
        headers: { authorization: `Bearer ${token}` },
    });
}

describe('getRequestContext — JWT secret fail-closed', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    it('rejects a token signed with the old fallback string when JWT_SECRET is unset', async () => {
        vi.stubEnv('JWT_SECRET', '');
        const forged = jwt.sign({ id: '1', role: 'STUDENT', type: 'access' }, 'secret');
        const ctx = await getRequestContext(requestWithBearer(forged));
        expect(ctx.isAuthenticated).toBe(false);
        expect(ctx.userId).toBeNull();
    });

    it('rejects a token signed with a placeholder secret even when JWT_SECRET equals that placeholder', async () => {
        vi.stubEnv('JWT_SECRET', 'secret');
        const forged = jwt.sign({ id: '1', role: 'STUDENT', type: 'access' }, 'secret');
        const ctx = await getRequestContext(requestWithBearer(forged));
        expect(ctx.isAuthenticated).toBe(false);
    });

    it('accepts a token signed with the configured secret', async () => {
        vi.stubEnv('JWT_SECRET', 'a-real-test-secret-that-is-long-enough-123456');
        const token = jwt.sign({ id: '42', role: 'STUDENT', type: 'access' }, 'a-real-test-secret-that-is-long-enough-123456');
        const ctx = await getRequestContext(requestWithBearer(token));
        expect(ctx.isAuthenticated).toBe(true);
        expect(ctx.userId).toBe(BigInt(42));
    });

    it('rejects a refresh token presented as a Bearer access token', async () => {
        vi.stubEnv('JWT_SECRET', 'a-real-test-secret-that-is-long-enough-123456');
        const refresh = jwt.sign({ id: '42', role: 'STUDENT', type: 'refresh' }, 'a-real-test-secret-that-is-long-enough-123456');
        const ctx = await getRequestContext(requestWithBearer(refresh));
        expect(ctx.isAuthenticated).toBe(false);
        expect(ctx.userId).toBeNull();
    });

    it('rejects a token without a type claim', async () => {
        vi.stubEnv('JWT_SECRET', 'a-real-test-secret-that-is-long-enough-123456');
        const untyped = jwt.sign({ id: '42', role: 'STUDENT' }, 'a-real-test-secret-that-is-long-enough-123456');
        const ctx = await getRequestContext(requestWithBearer(untyped));
        expect(ctx.isAuthenticated).toBe(false);
    });
});
