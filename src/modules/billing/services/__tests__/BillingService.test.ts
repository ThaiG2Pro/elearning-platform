import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from '../BillingService';
import type { VerifiedWebhookEvent } from '../PaymentProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makePrisma = () => ({
    users: {
        findUnique: vi.fn().mockResolvedValue({ stripe_customer_id: null }),
    },
});

const makeCreditRepo = () => ({
    addCredits: vi.fn().mockResolvedValue(120),
    ensureStripeCustomerId: vi.fn().mockResolvedValue(undefined),
});

const makePaymentProvider = () => ({
    createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://checkout.stripe.test/session',
        stripeCustomerId: 'cus_123',
    }),
    verifyAndParseWebhook: vi.fn(),
});

const makeEvent = (overrides: Partial<VerifiedWebhookEvent> = {}): VerifiedWebhookEvent => ({
    type: 'checkout.session.completed',
    referenceId: 'cs_test_abc',
    stripeCustomerId: 'cus_123',
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

    it('ignores event types other than checkout.session.completed without crediting', async () => {
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({ type: 'payment_intent.created' }),
        );

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
        // (standard = 120), không bao giờ từ metadata.
        provider.verifyAndParseWebhook.mockReturnValue(
            makeEvent({
                referenceId: 'cs_test_xyz',
                metadata: { userId: '7', packageId: 'standard', credits: '999999' },
            }),
        );

        await service.handleWebhook('raw', 'sig');

        expect(creditRepo.addCredits).toHaveBeenCalledTimes(1);
        expect(creditRepo.addCredits).toHaveBeenCalledWith(7n, 120, 'PURCHASE', 'cs_test_xyz');
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
                priceUsdCents: 199,
                userId: 7n,
            }),
        );
    });
});
