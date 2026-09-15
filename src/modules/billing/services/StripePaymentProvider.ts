import Stripe from 'stripe';
import { CheckoutSessionInput, CheckoutSessionResult, PaymentProvider, VerifiedWebhookEvent } from './PaymentProvider';

/**
 * WP4.1 — implementation thật của `PaymentProvider` qua Stripe Checkout
 * (hosted page — không tự render form thẻ, tránh phải lo PCI compliance).
 * Đọc key từ env mỗi lần gọi (đúng pattern `sharedFreeApiKey()` ở
 * AIGenerationService — đổi key không cần restart process trong dev).
 */
export class StripePaymentProvider implements PaymentProvider {
    private client(): Stripe {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('STRIPE_NOT_CONFIGURED');
        }
        return new Stripe(key);
    }

    async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
        const stripe = this.client();
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: input.existingStripeCustomerId ?? undefined,
            customer_email: input.existingStripeCustomerId ? undefined : input.userEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: input.packageLabel },
                        unit_amount: input.priceUsdCents,
                    },
                    quantity: 1,
                },
            ],
            // Metadata mang theo tới webhook — nguồn sự thật để biết cộng bao
            // nhiêu credit cho user nào (không suy đoán ngược từ giá tiền).
            metadata: {
                userId: input.userId.toString(),
                packageId: input.packageId,
            },
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
        });
        if (!session.url) {
            throw new Error('STRIPE_CHECKOUT_SESSION_MISSING_URL');
        }
        const stripeCustomerId =
            typeof session.customer === 'string' ? session.customer : input.existingStripeCustomerId ?? '';
        return { checkoutUrl: session.url, stripeCustomerId };
    }

    verifyAndParseWebhook(rawBody: string, signatureHeader: string | null): VerifiedWebhookEvent {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new Error('STRIPE_NOT_CONFIGURED');
        }
        if (!signatureHeader) {
            throw new Error('STRIPE_WEBHOOK_SIGNATURE_MISSING');
        }
        // Ném StripeSignatureVerificationError nếu chữ ký sai — route bắt và
        // trả 400, không xử lý payload chưa xác thực được (mục 6.2 tinh
        // thần: không tin dữ liệu đầu vào chưa xác minh nguồn).
        const event = this.client().webhooks.constructEvent(rawBody, signatureHeader, secret);
        const piId = (pi: string | Stripe.PaymentIntent | null | undefined): string | null =>
            typeof pi === 'string' ? pi : pi?.id ?? null;

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                return {
                    kind: 'checkout_completed',
                    type: event.type,
                    referenceId: session.id,
                    stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
                    paymentStatus: session.payment_status ?? null,
                    paymentIntentId: piId(session.payment_intent),
                    metadata: (session.metadata as Record<string, string>) ?? {},
                };
            }
            // 2026-09-15 — tiền RA. `charge.refunded` bắn 1 lần cho MỖI lần hoàn
            // (hoàn từng phần nhiều lần = nhiều event). Webhook KHÔNG kèm
            // `charge.refunds` (optional từ API 2022-11-15) nên luôn dùng
            // `amount_refunded` — số CỘNG DỒN — và để BillingService tính phần
            // chênh. Reference gắn với tổng đã hoàn → retry cùng event là no-op.
            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                const latest = charge.refunds?.data?.[0];
                return {
                    kind: 'charge_refunded',
                    type: event.type,
                    refundId: latest?.id ?? `${charge.id}:refunded:${charge.amount_refunded}`,
                    paymentIntentId: piId(charge.payment_intent),
                    refundedCents: charge.amount_refunded,
                    chargeCents: charge.amount,
                };
            }
            case 'charge.dispute.created': {
                const dispute = event.data.object as Stripe.Dispute;
                return {
                    kind: 'dispute_created',
                    type: event.type,
                    disputeId: dispute.id,
                    paymentIntentId: piId(dispute.payment_intent),
                    amountCents: dispute.amount,
                };
            }
            case 'charge.dispute.closed': {
                const dispute = event.data.object as Stripe.Dispute;
                return {
                    kind: 'dispute_closed',
                    type: event.type,
                    disputeId: dispute.id,
                    paymentIntentId: piId(dispute.payment_intent),
                    status: dispute.status,
                };
            }
            default:
                return { kind: 'ignored', type: event.type };
        }
    }
}
