import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, applyRateLimit, getClientIp, normaliseEmailKey, __resetRateLimitStore } from '../rateLimit';

describe('rateLimit', () => {
    beforeEach(() => __resetRateLimitStore());

    it('allows up to `limit` requests then blocks within the window', () => {
        const rule = { bucket: 't', key: 'a', limit: 3, windowMs: 60_000 };
        const t0 = 1_000_000;
        expect(checkRateLimit(rule, t0).allowed).toBe(true);
        expect(checkRateLimit(rule, t0 + 1).allowed).toBe(true);
        expect(checkRateLimit(rule, t0 + 2).allowed).toBe(true);
        const blocked = checkRateLimit(rule, t0 + 3);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
        expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
    });

    it('resets after the window expires', () => {
        const rule = { bucket: 't', key: 'a', limit: 1, windowMs: 1_000 };
        expect(checkRateLimit(rule, 0).allowed).toBe(true);
        expect(checkRateLimit(rule, 500).allowed).toBe(false);
        expect(checkRateLimit(rule, 1_000).allowed).toBe(true);
    });

    it('keeps keys and buckets independent', () => {
        expect(checkRateLimit({ bucket: 'x', key: 'k', limit: 1, windowMs: 60_000 }, 0).allowed).toBe(true);
        expect(checkRateLimit({ bucket: 'y', key: 'k', limit: 1, windowMs: 60_000 }, 0).allowed).toBe(true);
        expect(checkRateLimit({ bucket: 'x', key: 'k2', limit: 1, windowMs: 60_000 }, 0).allowed).toBe(true);
        expect(checkRateLimit({ bucket: 'x', key: 'k', limit: 1, windowMs: 60_000 }, 0).allowed).toBe(false);
    });

    it('applyRateLimit returns a 429 with code, error and Retry-After when exhausted', async () => {
        const rule = { bucket: 'login:ip', key: '1.2.3.4', limit: 1, windowMs: 60_000 };
        expect(applyRateLimit([rule])).toBeNull();
        const res = applyRateLimit([rule]);
        expect(res).not.toBeNull();
        expect(res!.status).toBe(429);
        expect(res!.headers.get('Retry-After')).toMatch(/^\d+$/);
        const body = await res!.json();
        expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('getClientIp prefers fly-client-ip, then first x-forwarded-for hop', () => {
        const mk = (h: Record<string, string>) => new NextRequest('http://localhost/x', { headers: h });
        expect(getClientIp(mk({ 'fly-client-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9');
        expect(getClientIp(mk({ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }))).toBe('1.1.1.1');
        expect(getClientIp(mk({}))).toBe('unknown');
    });

    it('normaliseEmailKey lowercases/trims and rejects non-strings', () => {
        expect(normaliseEmailKey('  A@B.COM ')).toBe('a@b.com');
        expect(normaliseEmailKey(42)).toBeNull();
        expect(normaliseEmailKey('')).toBeNull();
    });
});
