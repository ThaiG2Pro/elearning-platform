import { NextRequest, NextResponse } from 'next/server';
import { BillingController } from '@/modules/billing/controllers/BillingController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { prisma } from '@/shared/config/database';

/**
 * WP4.1 — tạo Stripe Checkout session cho 1 gói credit. Trả về `checkoutUrl`
 * để frontend redirect thẳng sang trang thanh toán hosted của Stripe (không
 * tự render form thẻ ở đây).
 */
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const body: { packageId?: string } = await request.json();
        if (!body.packageId) {
            return NextResponse.json({ error: 'PACKAGE_ID_REQUIRED' }, { status: 400 });
        }

        const user = await prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const controller = new BillingController();
        const result = await controller.createCheckoutSession({
            userId,
            userEmail: user.email,
            packageId: body.packageId,
            successUrl: `${frontendUrl}/billing?checkout=success`,
            cancelUrl: `${frontendUrl}/billing?checkout=cancelled`,
        });

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'UNKNOWN_CREDIT_PACKAGE') {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        if (message === 'STRIPE_NOT_CONFIGURED') {
            return NextResponse.json({ error: message }, { status: 503 });
        }
        console.error('Create checkout session error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
