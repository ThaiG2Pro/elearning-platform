import { NextRequest, NextResponse } from 'next/server';
import { BillingController } from '@/modules/billing/controllers/BillingController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * 2026-09-15 — lịch sử giao dịch credit của chính user (trang /billing).
 * Phân trang cursor theo id (`?cursor=<id dòng cuối>&limit=20`), mới nhất trước.
 */
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }
        const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? 20);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 20;
        const cursorRaw = request.nextUrl.searchParams.get('cursor');
        let cursor: bigint | undefined;
        if (cursorRaw) {
            if (!/^\d{1,18}$/.test(cursorRaw)) {
                return NextResponse.json({ error: 'INVALID_CURSOR' }, { status: 400 });
            }
            cursor = BigInt(cursorRaw);
        }
        const controller = new BillingController();
        return NextResponse.json(await controller.listTransactions(userId, limit, cursor));
    } catch (error) {
        console.error('List credit transactions error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
