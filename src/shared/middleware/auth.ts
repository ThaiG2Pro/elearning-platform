import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
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

