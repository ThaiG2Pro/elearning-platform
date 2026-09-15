import { NextRequest, NextResponse } from 'next/server';
import { BillingController } from '@/modules/billing/controllers/BillingController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/** WP4.1 — số dư credit hiện tại, hiển thị ở /billing (và các UI AI trả phí). */
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }
        const controller = new BillingController();
        // 2026-09-15 — kèm chi phí mỗi lượt để UI nói rõ "còn N, lượt này trừ M".
        return NextResponse.json(await controller.getCreditSummary(userId));
    } catch (error) {
        console.error('Get credit balance error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
