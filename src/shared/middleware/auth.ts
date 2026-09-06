import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getJwtSecret } from '../config/jwt';

export interface RequestContext {
    userId: bigint | null;
    role: string | null;
    isAuthenticated: boolean;
}

/**
 * Single point of truth for auth in this app: every route/service that needs
 * to know "who is calling" goes through this function. It is the only place
 * that touches the `Authorization` header and verifies the JWT — do not add
 * another JWT-parsing code path next to this one.
 */
export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        return { userId: null, role: null, isAuthenticated: false };
    }
    try {
        // getJwtSecret() throws when the secret is missing — caught below,
        // so a misconfigured server treats every token as unauthenticated
        // rather than verifying against a known fallback string.
        const decoded = jwt.verify(token, getJwtSecret()) as { id: string; role: string; type?: string };
        // Access and refresh tokens share a secret; only the short-lived
        // access token may authorize API calls. A stolen 7-day refresh token
        // must never be accepted here.
        if (decoded.type !== 'access') {
            return { userId: null, role: null, isAuthenticated: false };
        }
        return { userId: BigInt(decoded.id), role: decoded.role, isAuthenticated: true };
    } catch (error) {
        return { userId: null, role: null, isAuthenticated: false };
    }
}

/** Thin wrapper over {@link getRequestContext} for call sites that only need the id. */
export async function getUserIdFromRequest(request: NextRequest): Promise<bigint | null> {
    const ctx = await getRequestContext(request);
    return ctx.userId;
}

/** Thin wrapper over {@link getRequestContext} for call sites that need id + role. */
export async function getUserFromRequest(request: NextRequest): Promise<{ id: bigint; role: string } | null> {
    const ctx = await getRequestContext(request);
    if (!ctx.isAuthenticated || ctx.userId === null || ctx.role === null) {
        return null;
    }
    return { id: ctx.userId, role: ctx.role };
}

