import { NextResponse } from 'next/server';
import { prisma } from '../../../shared/config/database';

export const dynamic = 'force-dynamic';

/**
 * Ops (2026-09-09) — endpoint sức khoẻ cho Docker HEALTHCHECK, Caddy và
 * scripts/ops/deploy.sh. Ping DB bằng câu SELECT rẻ nhất; không auth, không
 * cache, không lộ chi tiết lỗi (chỉ status). Không đi qua rate limit vì
 * nằm ngoài /api/v1.
 */
export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ status: 'db_unreachable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
