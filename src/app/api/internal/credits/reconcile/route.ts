import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/config/database';
import { AIGenerationRepository } from '@/modules/ai-generation/repositories/AIGenerationRepository';
import { CreditRepository } from '@/modules/billing/repositories/CreditRepository';
import { CreditReconciliationService } from '@/modules/billing/services/CreditReconciliationService';
import { sendOpsAlert } from '@/shared/ops/alert';

/**
 * 2026-09-15 — job đối soát credit chạy TRONG container app, gọi bằng cron
 * trên VPS qua curl. Lý do không dùng scripts/reconcileCredits.ts trên VPS:
 * image runtime (Next standalone) không có ts-node — xem "Chưa làm / biết
 * trước" ở docs/LAUNCH_CHECKLIST.md. Script vẫn giữ để chạy tay từ máy dev.
 *
 * Bảo vệ bằng `INTERNAL_CRON_SECRET` (Authorization: Bearer …). Không đặt
 * secret = endpoint tắt hẳn (404), không phải "mở cho mọi người".
 * Không JWT: đây là lối gọi máy-tới-máy, không có user.
 */
export const maxDuration = 60;

function inFlightWindowMs(): number {
    const parsed = Number(process.env.AI_IN_FLIGHT_WINDOW_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60_000;
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export async function POST(request: NextRequest) {
    const secret = process.env.INTERNAL_CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const header = request.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !timingSafeEqual(token, secret)) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
    try {
        const service = new CreditReconciliationService(
            new AIGenerationRepository(prisma),
            new CreditRepository(prisma),
            sendOpsAlert,
        );
        const result = await service.reconcile(new Date(Date.now() - inFlightWindowMs()), { dryRun });
        return NextResponse.json({
            dryRun,
            orphanedMarkedFailed: result.orphanedMarkedFailed.map(String),
            refunded: result.refunded.map((r) => ({ aiGenerationId: r.aiGenerationId.toString(), userId: r.userId.toString(), amount: r.amount })),
            balanceMismatches: result.balanceMismatches.map((m) => ({ userId: m.userId.toString(), balance: m.balance, ledgerSum: m.ledgerSum })),
        });
    } catch (error) {
        console.error('credits reconcile error:', error);
        await sendOpsAlert('Job đối soát credit LỖI', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
