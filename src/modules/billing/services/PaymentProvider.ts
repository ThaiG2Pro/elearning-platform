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

/**
 * Sự kiện webhook đã xác thực chữ ký và chuẩn hoá. 2026-09-15 — mở rộng từ
 * 1 hình dạng (checkout) thành union theo `kind`, để BillingService xử lý
 * được cả tiền RA: Stripe hoàn tiền và chargeback. Mọi type Stripe khác
 * rơi về `ignored` — route vẫn 200 để Stripe không retry vô ích.
 */
export interface CheckoutCompletedEvent {
    kind: 'checkout_completed';
    type: string;
    /** Checkout Session id — stripeReference chống double-credit. */
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
    /** PaymentIntent id — lưu cùng dòng PURCHASE để refund/dispute nối ngược. */
    paymentIntentId: string | null;
    /** metadata gắn lúc tạo checkout session (userId, packageId). */
    metadata: Record<string, string>;
}

export interface ChargeRefundedEvent {
    kind: 'charge_refunded';
    type: string;
    /**
     * Reference cho dòng thu hồi, duy nhất theo TRẠNG THÁI cộng dồn của charge
     * (refund id nếu Stripe gửi kèm, không thì `<charge>:refunded:<tổng đã hoàn>`).
     * Stripe retry cùng event → cùng reference → không thu hồi 2 lần.
     */
    refundId: string;
    paymentIntentId: string | null;
    /**
     * TỔNG đã hoàn tới thời điểm này (`charge.amount_refunded`), KHÔNG phải số
     * của riêng lần này. Từ API 2022-11-15 webhook không kèm `charge.refunds`
     * nên không có cách đáng tin lấy số của từng lần; BillingService tính thu
     * hồi theo mục tiêu cộng dồn trừ đi phần đã thu hồi.
     */
    refundedCents: number;
    /** Số tiền gốc của charge. */
    chargeCents: number;
}

export interface DisputeCreatedEvent {
    kind: 'dispute_created';
    type: string;
    disputeId: string;
    paymentIntentId: string | null;
    amountCents: number;
}

export interface DisputeClosedEvent {
    kind: 'dispute_closed';
    type: string;
    disputeId: string;
    paymentIntentId: string | null;
    /** 'won' | 'lost' | 'warning_closed' | … theo Stripe. */
    status: string;
}

export interface IgnoredEvent {
    kind: 'ignored';
    type: string;
}

export type VerifiedWebhookEvent =
    | CheckoutCompletedEvent
    | ChargeRefundedEvent
    | DisputeCreatedEvent
    | DisputeClosedEvent
    | IgnoredEvent;

export interface PaymentProvider {
    createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
    /**
     * Xác thực chữ ký webhook + parse thành sự kiện đã chuẩn hoá. Throw nếu
     * chữ ký sai (route trả 400, không xử lý payload không xác thực được).
     */
    verifyAndParseWebhook(rawBody: string, signatureHeader: string | null): VerifiedWebhookEvent;
}
