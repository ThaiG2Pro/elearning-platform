import { NextRequest, NextResponse } from 'next/server';
import { BillingController } from '@/modules/billing/controllers/BillingController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/** WP4.1 — số dư credit hiện tại, hiển thị ở /billing và AIGenerationPanel. */
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }
        const controller = new BillingController();
        const creditBalance = await controller.getBalance(userId);
        return NextResponse.json({ creditBalance });
    } catch (error) {
        console.error('Get credit balance error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
