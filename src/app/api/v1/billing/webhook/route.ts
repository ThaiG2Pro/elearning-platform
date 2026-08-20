import { NextRequest, NextResponse } from 'next/server';
import { BillingController } from '@/modules/billing/controllers/BillingController';

/**
 * WP4.1 — Stripe gọi endpoint này trực tiếp (không qua JWT của app, không
 * đọc `getUserIdFromRequest` — xác thực bằng chữ ký HMAC `Stripe-Signature`
 * thay vì token đăng nhập). Bắt buộc lấy `request.text()` (raw body) TRƯỚC
 * khi parse gì cả — chữ ký Stripe ký trên đúng byte gốc, `request.json()`
 * làm mất khả năng verify lại.
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    try {
        const controller = new BillingController();
        await controller.handleWebhook(rawBody, signature);
        return NextResponse.json({ received: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'WEBHOOK_ERROR';
        // Chữ ký sai hoặc thiếu → 400, không xử lý payload chưa xác thực
        // được (mục 6.2 tinh thần). Mọi lỗi khác vẫn 400 để Stripe tự retry
        // theo lịch của chính nó thay vì coi là đã xử lý xong.
        console.error('Stripe webhook error:', message);
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
