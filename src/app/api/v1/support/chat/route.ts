import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { applyRateLimit, getClientIp } from '@/shared/middleware/rateLimit';

/**
 * Proxy widget CSKH → AI agent (repo ai-agent-sale-v2, graph CSKH riêng
 * `support_graph`, endpoint POST {AI_AGENT_URL}/support/query — không phải
 * /agent/query của bot bán hàng).
 *
 * Vì sao có route này thay vì gọi thẳng từ browser:
 * - agent không lộ ra Internet; `AI_AGENT_API_KEY` chỉ nằm ở server;
 * - rate-limit theo IP + phiên ở đây (agent không tự giới hạn người lạ);
 * - `customer_id` (bộ nhớ xuyên phiên của agent) gắn với user đã đăng nhập,
 *   khách vãng lai dùng cookie ẩn danh — browser không tự chọn được id.
 *
 * Không cấu hình AI_AGENT_URL → 503, widget tự rơi về menu FAQ tĩnh.
 */

const ANON_COOKIE = 'spacely_support_anon';
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MESSAGE_MAX_CHARS = 1000;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const MIN = 60 * 1000;

interface ChatRequestBody {
    message?: unknown;
    sessionId?: unknown;
    context?: unknown;
}

interface SupportQueryResponse {
    session_id: string;
    answer: string;
    declined: boolean;
    intent?: string;
    citations?: { name: string }[];
    elapsed_ms?: number;
}

function agentTimeoutMs(): number {
    const parsed = Number(process.env.AI_AGENT_TIMEOUT_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
}

export async function POST(request: NextRequest) {
    const agentUrl = process.env.AI_AGENT_URL?.replace(/\/+$/, '');
    if (!agentUrl) {
        return NextResponse.json({ error: 'AI_AGENT_NOT_CONFIGURED' }, { status: 503 });
    }

    let body: ChatRequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > MESSAGE_MAX_CHARS) {
        return NextResponse.json({ error: 'MESSAGE_INVALID' }, { status: 400 });
    }
    const clientSessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    if (!SESSION_ID_PATTERN.test(clientSessionId)) {
        return NextResponse.json({ error: 'SESSION_ID_INVALID' }, { status: 400 });
    }

    // Ai đang hỏi: user đăng nhập → id thật (agent nhớ xuyên phiên); khách →
    // cookie ẩn danh, cấp mới nếu chưa có.
    const userId = await getUserIdFromRequest(request);
    let anonId = request.cookies.get(ANON_COOKIE)?.value;
    let setAnonCookie = false;
    if (!userId && (!anonId || !SESSION_ID_PATTERN.test(anonId))) {
        anonId = randomUUID();
        setAnonCookie = true;
    }
    const customerId = userId ? `spacely-user-${userId.toString()}` : `spacely-anon-${anonId}`;

    const ip = getClientIp(request);
    const limited = applyRateLimit([
        { bucket: 'support-chat:ip', key: ip, limit: 40, windowMs: 10 * MIN },
        { bucket: 'support-chat:customer', key: customerId, limit: 15, windowMs: MIN },
    ]);
    if (limited) return limited;

    const agentSessionId = `web:${customerId}:${clientSessionId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), agentTimeoutMs());

    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (process.env.AI_AGENT_API_KEY) headers['X-Agent-Key'] = process.env.AI_AGENT_API_KEY;

        const upstream = await fetch(`${agentUrl}/support/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, session_id: agentSessionId, customer_id: customerId }),
            signal: controller.signal,
            cache: 'no-store',
        });

        if (!upstream.ok) {
            console.warn('support/chat: agent upstream error', upstream.status);
            return NextResponse.json({ error: 'AI_AGENT_UPSTREAM' }, { status: 502 });
        }

        const data = (await upstream.json()) as SupportQueryResponse;
        if (typeof data.answer !== 'string' || !data.answer.trim()) {
            console.warn('support/chat: agent returned empty answer');
            return NextResponse.json({ error: 'AI_AGENT_UPSTREAM' }, { status: 502 });
        }

        const response = NextResponse.json({
            answer: data.answer,
            declined: Boolean(data.declined),
            intent: data.intent ?? 'UNKNOWN',
            sessionId: clientSessionId,
            citations: (data.citations ?? []).map((c) => c.name).filter(Boolean).slice(0, 3),
            elapsedMs: Math.round(data.elapsed_ms ?? 0),
        });
        if (setAnonCookie && anonId) {
            response.cookies.set(ANON_COOKIE, anonId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/api/v1/support',
                maxAge: ANON_COOKIE_MAX_AGE,
            });
        }
        return response;
    } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        console.warn('support/chat: agent call failed', aborted ? 'timeout' : error);
        return NextResponse.json(
            { error: aborted ? 'AI_AGENT_TIMEOUT' : 'AI_AGENT_UNREACHABLE' },
            { status: aborted ? 504 : 502 },
        );
    } finally {
        clearTimeout(timer);
    }
}
