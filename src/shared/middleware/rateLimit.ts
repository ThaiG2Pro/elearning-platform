import { NextRequest, NextResponse } from 'next/server';

/**
 * Fixed-window, in-memory rate limiter.
 *
 * Scope: this protects a single Node process. It is sufficient for the current
 * deployment (one Fly machine). If the app is ever scaled to multiple
 * instances, replace the `buckets` Map with a shared store (Redis / DB) —
 * the public API below can stay the same.
 */

interface Bucket {
    count: number;
    resetAt: number;
}

export interface RateLimitRule {
    /** Logical name, e.g. 'login:ip'. Keeps keys from different rules apart. */
    bucket: string;
    /** Subject being limited: an IP, a normalised email, a user id… */
    key: string;
    /** Max requests allowed per window. */
    limit: number;
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    /** Seconds until the window resets (only meaningful when not allowed). */
    retryAfterSec: number;
}

const buckets = new Map<string, Bucket>();
const PRUNE_EVERY = 500;
let callsSincePrune = 0;

function pruneExpired(now: number): void {
    for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
    }
}

export function checkRateLimit(rule: RateLimitRule, now: number = Date.now()): RateLimitResult {
    if (++callsSincePrune >= PRUNE_EVERY) {
        callsSincePrune = 0;
        pruneExpired(now);
    }

    const id = `${rule.bucket}|${rule.key}`;
    const existing = buckets.get(id);
    if (!existing || existing.resetAt <= now) {
        buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
        return { allowed: true, retryAfterSec: 0 };
    }

    existing.count += 1;
    if (existing.count > rule.limit) {
        return {
            allowed: false,
            retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }
    return { allowed: true, retryAfterSec: 0 };
}

/** Test hook — never call from application code. */
export function __resetRateLimitStore(): void {
    buckets.clear();
    callsSincePrune = 0;
}

/**
 * Best-effort client IP. Fly.io sets `fly-client-ip`; generic proxies set
 * `x-forwarded-for` (first hop is the client). Falls back to a constant so
 * the limiter still applies (globally) when no header is present.
 */
export function getClientIp(request: NextRequest): string {
    const fly = request.headers.get('fly-client-ip');
    if (fly) return fly.trim();
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
    return 'unknown';
}

export function normaliseEmailKey(email: unknown): string | null {
    if (typeof email !== 'string') return null;
    const e = email.trim().toLowerCase();
    return e.length > 0 ? e.slice(0, 254) : null;
}

/**
 * Evaluate every rule; if any is exhausted, return a ready-to-send 429.
 * Returns `null` when the request may proceed.
 *
 * The body carries both `code` and `error` because older client code reads
 * `error` for the identify endpoint and `code` everywhere else.
 */
export function applyRateLimit(rules: RateLimitRule[]): NextResponse | null {
    let worst = 0;
    for (const rule of rules) {
        const r = checkRateLimit(rule);
        if (!r.allowed) worst = Math.max(worst, r.retryAfterSec);
    }
    if (worst === 0) return null;
    return NextResponse.json(
        {
            code: 'RATE_LIMIT_EXCEEDED',
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
        },
        { status: 429, headers: { 'Retry-After': String(worst) } }
    );
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Central place for the auth endpoint budgets so they are easy to tune. */
export const AUTH_RATE_LIMITS = {
    loginPerIp: { limit: 20, windowMs: 15 * MIN },
    loginPerEmail: { limit: 8, windowMs: 15 * MIN },
    identifyPerIp: { limit: 30, windowMs: 10 * MIN },
    registerPerIp: { limit: 5, windowMs: HOUR },
    forgotPerIp: { limit: 10, windowMs: HOUR },
    forgotPerEmail: { limit: 3, windowMs: HOUR },
    resetPerIp: { limit: 10, windowMs: 15 * MIN },
    activatePerIp: { limit: 10, windowMs: 15 * MIN },
} as const;

/** Per-user budgets for endpoints that make the server fetch/parse user-supplied data. */
export const UPLOAD_RATE_LIMITS = {
    quizUploadPerUser: { limit: 30, windowMs: 10 * MIN },
    fromLinkPerUser: { limit: 20, windowMs: 10 * MIN },
} as const;

/**
 * Perf (2026-09-06) — endpoint giữ connection lâu / kéo nhiều dữ liệu.
 * AI generation là request sync tới LLM (tới 60s), export-data kéo toàn bộ
 * dữ liệu user vào RAM. Quota theo ngày của AIGenerationPolicy vẫn áp sau,
 * đây chỉ là cầu chì chống burst từ 1 user/1 IP.
 */
export const HEAVY_RATE_LIMITS = {
    aiGeneratePerUser: { limit: 6, windowMs: MIN },
    aiGeneratePerIp: { limit: 20, windowMs: MIN },
    exportDataPerUser: { limit: 2, windowMs: HOUR },
} as const;

/** Quiz .xlsx files are buffered fully in memory before parsing. */
export const QUIZ_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
