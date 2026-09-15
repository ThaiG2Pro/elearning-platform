import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../BillingService';
import type { CheckoutCompletedEvent, VerifiedWebhookEvent } from '../PaymentProvider';

vi.mock('../../../../shared/ops/alert', () => ({ sendOpsAlert: vi.fn().mockResolvedValue(undefined) }));
import { sendOpsAlert } from '../../../../shared/ops/alert';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makePrisma = () => ({
    users: {
        findUnique: vi.fn().mockResolvedValue({ stripe_customer_id: null }),
    },
});

const makeCreditRepo = () => ({
    addCredits: vi.fn().mockResolvedValue(30),
    ensureStripeCustomerId: vi.fn().mockResolvedValue(undefined),
    findPurchaseByPaymentIntent: vi.fn().mockResolvedValue(null),
    adjustCreditsForStripeEvent: vi.fn().mockResolvedValue(0),
});

const makePaymentProvider = () => ({
    createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.stripe.test/session',
        stripeCustomerId: 'cus_123',
    }),
    verifyAndParseWebhook: vi.fn(),
});

const makeEvent = (overrides: Partial<CheckoutCompletedEvent> = {}): VerifiedWebhookEvent => ({
    kind: 'checkout_completed',
    type: 'checkout.session.completed',
    referenceId: 'cs_test_abc',
    stripeCustomerId: 'cus_123',
    paymentStatus: 'paid',
    paymentIntentId: 'pi_123',
    metadata: { userId: '7', packageId: 'standard' },
    ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────
// Hàng rào tiền: webhook giả mạo/metadata thiếu/gói không tồn tại tuyệt đối
// không được cộng credit; số credit luôn lấy từ bảng gói server-side.

describe('BillingService.handleWebhook', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let creditRepo: ReturnType<typeof makeCreditRepo>;
    let provider: ReturnType<typeof makePaymentProvider>;
    let service: BillingService;

    beforeEach(() => {
        prisma = makePrisma();
        creditRepo = makeCreditRepo();
        provider = makePaymentProvider();
        service = new BillingService(prisma as any, creditRepo as any, provider as any);
    });

    it('propagates a signature-verification failure and never credits', async () => {
        provider.verifyAndParseWebhook.mockImplementation(() => {
            throw new Error('STRIPE_WEBHOOK_SIGNATURE_INVALID');
        });

        await expect(service.handleWebhook('raw', 'bad-sig')).rejects.toThrow(
            'STRIPE_WEBHOOK_SIGNATURE_INVALID',
        );
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    it('propagates a missing-signature-header failure and never credits', async () => {
        provider.verifyAndParseWebhook.mockImplementation(() => {
            throw new Error('STRIPE_WEBHOOK_SIGNATURE_MISSING');
        });

        await expect(service.handleWebhook('raw', null)).rejects.toThrow(
            'STRIPE_WEBHOOK_SIGNATURE_MISSING',
        );
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    // Security: "completed" không đồng nghĩa "đã thu tiền" — chỉ 'paid' mới
    // cộng credit; unpaid/no_payment_required/null đều bỏ qua, không throw.
    it.each(['unpaid', 'no_payment_required', null])(
        'does not credit when payment_status is %s (session completed but not paid)',
        async (paymentStatus) => {
            provider.verifyAndParseWebhook.mockReturnValue(makeEvent({ paymentStatus }));

            await expect(service.handleWebhook('raw', 'sig')).resolves.toBeUndefined();
            expect(creditRepo.addCredits).not.toHaveBeenCalled();
        },
    );

    it('ignores event types other than checkout.session.completed without crediting', async () => {
        provider.verifyAndParseWebhook.mockReturnValue({ kind: 'ignored', type: 'payment_intent.created' });

        await service.handleWebhook('raw', 'sig');
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    it('throws STRIPE_WEBHOOK_METADATA_MISSING when userId is absent, without crediting', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({ metadata: { packageId: 'standard' } }),
        );

        await expect(service.handleWebhook('raw', 'sig')).rejects.toThrow(
            'STRIPE_WEBHOOK_METADATA_MISSING',
        );
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    it('throws STRIPE_WEBHOOK_METADATA_MISSING when packageId is blank, without crediting', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({ metadata: { userId: '7', packageId: '' } }),
        );

        await expect(service.handleWebhook('raw', 'sig')).rejects.toThrow(
            'STRIPE_WEBHOOK_METADATA_MISSING',
        );
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    it('throws UNKNOWN_CREDIT_PACKAGE for a fabricated packageId, without crediting', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({ metadata: { userId: '7', packageId: 'mega-free-9999' } }),
        );

        await expect(service.handleWebhook('raw', 'sig')).rejects.toThrow(
            'UNKNOWN_CREDIT_PACKAGE',
        );
        expect(creditRepo.addCredits).not.toHaveBeenCalled();
    });

    it('credits the server-table amount for the package, keyed by referenceId', async () => {
        // Payload cố nhét credits giả — số cộng phải lấy từ CREDIT_PACKAGES
        // (standard = 30), không bao giờ từ metadata.
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({
                referenceId: 'cs_test_xyz',
                metadata: { userId: '7', packageId: 'standard', credits: '999999' },
            }),
        );

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.addCredits).toHaveBeenCalledTimes(1);
        expect(creditRepo.addCredits).toHaveBeenCalledWith(7n, 30, 'PURCHASE', 'cs_test_xyz', 'pi_123');
    });
});

describe('BillingService.createCheckoutSession', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let creditRepo: ReturnType<typeof makeCreditRepo>;
    let provider: ReturnType<typeof makePaymentProvider>;
    let service: BillingService;

    const baseRequest = {
        userId: 7n,
        userEmail: 'user@example.com',
        packageId: 'starter',
        successUrl: 'https://app.test/billing?ok=1',
        cancelUrl: 'https://app.test/billing?cancel=1',
    };

    beforeEach(() => {
        prisma = makePrisma();
        creditRepo = makeCreditRepo();
        provider = makePaymentProvider();
        service = new BillingService(prisma as any, creditRepo as any, provider as any);
    });

    it('rejects an unknown packageId before touching the payment provider', async () => {
        await expect(
            service.createCheckoutSession({ ...baseRequest, packageId: 'not-a-package' }),
        ).rejects.toThrow('UNKNOWN_CREDIT_PACKAGE');
        expect(provider.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('forwards the server-side price and id for the package, never client input', async () => {
        await service.createCheckoutSession(baseRequest);

        expect(provider.createCheckoutSession).toHaveBeenCalledWith(
            expect.objectContaining({
                packageId: 'starter',
                priceUsdCents: 100,
                userId: 7n,
            }),
        );
    });
});

// ── 2026-09-15 — tiền RA: Stripe hoàn tiền / chargeback ─────────────────────
// Mọi thu hồi tính theo MỤC TIÊU CỘNG DỒN trừ phần đã thu hồi (Stripe gửi
// amount_refunded cộng dồn, không có số của từng lần) → không trùng, không vượt.

describe('BillingService.handleWebhook — refund & dispute', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let creditRepo: ReturnType<typeof makeCreditRepo> & {
        sumStripeAdjustmentsForPurchase: ReturnType<typeof vi.fn>;
        findByStripeReference: ReturnType<typeof vi.fn>;
    };
    let provider: ReturnType<typeof makePaymentProvider>;
    let service: BillingService;

    const purchase = { userId: 7n, credits: 30, stripeReference: 'cs_test_abc' };

    beforeEach(() => {
        vi.mocked(sendOpsAlert).mockClear();
        prisma = makePrisma();
        creditRepo = {
            ...makeCreditRepo(),
            sumStripeAdjustmentsForPurchase: vi.fn().mockResolvedValue(0),
            findByStripeReference: vi.fn().mockResolvedValue(null),
        };
        creditRepo.findPurchaseByPaymentIntent.mockResolvedValue(purchase);
        provider = makePaymentProvider();
        service = new BillingService(prisma as any, creditRepo as any, provider as any);
    });

    const refunded = (refundId: string, refundedCents: number, chargeCents = 300) => ({
        kind: 'charge_refunded' as const, type: 'charge.refunded',
        refundId, paymentIntentId: 'pi_123', refundedCents, chargeCents,
    });

    it('hoàn toàn bộ → thu hồi toàn bộ credit của gói, gắn payment_intent', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(refunded('re_1', 300));

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, -30, 'STRIPE_REFUND_CLAWBACK', 're_1', 'pi_123');
        expect(sendOpsAlert).toHaveBeenCalled();
    });

    it('hoàn một phần → thu hồi theo tỉ lệ, làm tròn lên', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(refunded('re_2', 100));

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, -10, 'STRIPE_REFUND_CLAWBACK', 're_2', 'pi_123');
    });

    it('LỖ HỔNG ĐÃ CHẶN: hoàn từng phần 2 lần (amount_refunded cộng dồn) chỉ thu hồi phần chênh, không trùng', async () => {
        // Lần 1 đã thu hồi 10 (hoàn $1/$3). Lần 2 Stripe báo tổng đã hoàn $2 → mục tiêu 20, chỉ trừ thêm 10.
        creditRepo.sumStripeAdjustmentsForPurchase.mockResolvedValue(-10);
        provider.verifyAndParseWebhook.mockReturnValue(refunded('ch_1:refunded:200', 200));

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, -10, 'STRIPE_REFUND_CLAWBACK', 'ch_1:refunded:200', 'pi_123');
    });

    it('Stripe retry cùng trạng thái cộng dồn → phần chênh = 0 → không trừ gì', async () => {
        creditRepo.sumStripeAdjustmentsForPurchase.mockResolvedValue(-10);
        provider.verifyAndParseWebhook.mockReturnValue(refunded('ch_1:refunded:100', 100));

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).not.toHaveBeenCalled();
    });

    it('refund CHỒNG lên dispute đã thu hồi hết → không âm thêm quá số credit gói', async () => {
        creditRepo.sumStripeAdjustmentsForPurchase.mockResolvedValue(-30);
        provider.verifyAndParseWebhook.mockReturnValue(refunded('re_9', 300));

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).not.toHaveBeenCalled();
    });

    it('refund không khớp gói nào → không đoán, chỉ cảnh báo, vẫn resolve (Stripe nhận 200)', async () => {
        creditRepo.findPurchaseByPaymentIntent.mockResolvedValue(null);
        provider.verifyAndParseWebhook.mockReturnValue({ ...refunded('re_3', 300), paymentIntentId: 'pi_unknown' });

        await expect(service.handleWebhook('raw', 'sig')).resolves.toBeUndefined();
        expect(creditRepo.adjustCreditsForStripeEvent).not.toHaveBeenCalled();
        expect(sendOpsAlert).toHaveBeenCalledWith(expect.stringContaining('không khớp'), expect.anything());
    });

    it('dispute mở → thu hồi phần credit còn lại của gói, reference = dispute id', async () => {
        provider.verifyAndParseWebhook.mockReturnValue({
            kind: 'dispute_created', type: 'charge.dispute.created',
            disputeId: 'dp_1', paymentIntentId: 'pi_123', amountCents: 300,
        });

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, -30, 'DISPUTE_CLAWBACK', 'dp_1', 'pi_123');
    });

    it('dispute mở sau khi đã refund một phần → chỉ thu hồi nốt phần còn lại', async () => {
        creditRepo.sumStripeAdjustmentsForPurchase.mockResolvedValue(-10);
        provider.verifyAndParseWebhook.mockReturnValue({
            kind: 'dispute_created', type: 'charge.dispute.created',
            disputeId: 'dp_2', paymentIntentId: 'pi_123', amountCents: 200,
        });

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, -20, 'DISPUTE_CLAWBACK', 'dp_2', 'pi_123');
    });

    it('thắng dispute → trả lại ĐÚNG phần DISPUTE_CLAWBACK của dispute đó', async () => {
        creditRepo.findByStripeReference.mockResolvedValue({ userId: 7n, amount: -20 });
        provider.verifyAndParseWebhook.mockReturnValue({
            kind: 'dispute_closed', type: 'charge.dispute.closed',
            disputeId: 'dp_2', paymentIntentId: 'pi_123', status: 'won',
        });

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.findByStripeReference).toHaveBeenCalledWith('dp_2');
        expect(creditRepo.adjustCreditsForStripeEvent).toHaveBeenCalledWith(7n, 20, 'DISPUTE_WON_RESTORE', 'dp_2:won', 'pi_123');
    });

    it('LỖ HỔNG ĐÃ CHẶN: thắng dispute nhưng chưa từng thu hồi (bỏ lỡ event created) → KHÔNG in credit', async () => {
        creditRepo.findByStripeReference.mockResolvedValue(null);
        provider.verifyAndParseWebhook.mockReturnValue({
            kind: 'dispute_closed', type: 'charge.dispute.closed',
            disputeId: 'dp_ghost', paymentIntentId: 'pi_123', status: 'won',
        });

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).not.toHaveBeenCalled();
        expect(sendOpsAlert).toHaveBeenCalledWith(expect.stringContaining('không có dòng thu hồi'), expect.anything());
    });

    it('thua dispute → không đụng số dư (đã thu hồi lúc mở), chỉ cảnh báo', async () => {
        provider.verifyAndParseWebhook.mockReturnValue({
            kind: 'dispute_closed', type: 'charge.dispute.closed',
            disputeId: 'dp_1', paymentIntentId: 'pi_123', status: 'lost',
        });

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.adjustCreditsForStripeEvent).not.toHaveBeenCalled();
        expect(sendOpsAlert).toHaveBeenCalled();
    });
});
