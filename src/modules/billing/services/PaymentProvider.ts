/**
 * WP4.1 — cô lập Stripe SDK sau 1 interface, cùng pattern
 * TranscriptProvider/LLMProvider/WebContentProvider ở module ai-generation:
 * đổi/thêm payment provider khác sau này không đụng BillingService.
 */
export interface CheckoutSessionInput {
    userId: bigint;
    userEmail: string;
    /** Stripe Customer id đã lưu trước đó — undefined nếu đây là lần mua đầu. */
    existingStripeCustomerId: string | null;
    packageId: string;
    priceUsdCents: number;
    packageLabel: string;
    successUrl: string;
    cancelUrl: string;
}

export interface CheckoutSessionResult {
    checkoutUrl: string;
    /** Stripe Customer id — mới tạo hoặc đã có sẵn, để lưu lại lần đầu. */
    stripeCustomerId: string;
}

export interface VerifiedWebhookEvent {
    type: string;
    /** id của session/payment_intent — dùng làm stripeReference chống double-credit. */
    referenceId: string;
    stripeCustomerId: string | null;
    /**
     * Security — `payment_status` của Checkout Session ('paid' | 'unpaid' |
     * 'no_payment_required'). `checkout.session.completed` chỉ có nghĩa là
     * user đã đi hết flow checkout, KHÔNG có nghĩa là tiền đã về: phương thức
     * trả chậm (bank transfer, boleto, OXXO…) hoàn tất session với
     * 'unpaid' và Stripe sẽ gửi `checkout.session.async_payment_succeeded`
     * sau. Chỉ cộng credit khi 'paid'. null nếu provider không cung cấp.
     */
    paymentStatus: string | null;
    /** metadata gắn lúc tạo checkout session (userId, packageId, credits...). */
    metadata: Record<string, string>;
}

export interface PaymentProvider {
    createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
    /**
     * Xác thực chữ ký webhook + parse thành sự kiện đã chuẩn hoá. Throw nếu
     * chữ ký sai (route trả 400, không xử lý payload không xác thực được).
     */
    verifyAndParseWebhook(rawBody: string, signatureHeader: string | null): VerifiedWebhookEvent;
}
