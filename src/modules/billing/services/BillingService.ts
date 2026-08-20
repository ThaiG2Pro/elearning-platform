import { PrismaClient } from '@prisma/client';
import { findCreditPackage } from '../domain/CreditLedger';
import { CreditRepository } from '../repositories/CreditRepository';
import { PaymentProvider } from './PaymentProvider';

export interface CreateCheckoutSessionRequest {
    userId: bigint;
    userEmail: string;
    packageId: string;
    successUrl: string;
    cancelUrl: string;
}

/**
 * WP4.1 — service tầng trên nối Stripe (qua `PaymentProvider`) với
 * `CreditRepository` (ledger). Route chỉ gọi 2 method public ở đây, không tự
 * chạm Stripe SDK hay Prisma trực tiếp — cùng pattern
 * AIGenerationController → AIGenerationService.
 */
export class BillingService {
    constructor(
        private prisma: PrismaClient,
        private creditRepo: CreditRepository,
        private paymentProvider: PaymentProvider,
    ) { }

    async createCheckoutSession(req: CreateCheckoutSessionRequest): Promise<{ checkoutUrl: string }> {
        const pkg = findCreditPackage(req.packageId);
        if (!pkg) {
            throw new Error('UNKNOWN_CREDIT_PACKAGE');
        }
        const user = await this.prisma.users.findUnique({
            where: { id: req.userId },
            select: { stripe_customer_id: true },
        });
        const result = await this.paymentProvider.createCheckoutSession({
            userId: req.userId,
            userEmail: req.userEmail,
            existingStripeCustomerId: user?.stripe_customer_id ?? null,
            packageId: pkg.id,
            priceUsdCents: pkg.priceUsdCents,
            packageLabel: pkg.label,
            successUrl: req.successUrl,
            cancelUrl: req.cancelUrl,
        });
        // Lưu lại Customer id lần đầu (lazy) — lần mua sau tái dùng, tránh
        // Stripe tạo Customer mới mỗi lần (khó gộp lịch sử thanh toán 1 user).
        if (result.stripeCustomerId && result.stripeCustomerId !== user?.stripe_customer_id) {
            await this.creditRepo.ensureStripeCustomerId(req.userId, result.stripeCustomerId);
        }
        return { checkoutUrl: result.checkoutUrl };
    }

    /**
     * Webhook handler — xác thực chữ ký trước (route truyền rawBody nguyên
     * văn, chưa parse JSON, bắt buộc cho HMAC verify của Stripe), rồi cộng
     * credit theo `metadata.packageId`/`metadata.userId` gắn lúc tạo session
     * (không suy đoán ngược từ số tiền — mục 6.2 tinh thần).
     */
    async handleWebhook(rawBody: string, signatureHeader: string | null): Promise<void> {
        const event = this.paymentProvider.verifyAndParseWebhook(rawBody, signatureHeader);
        if (event.type !== 'checkout.session.completed') {
            return;
        }
        const userIdRaw = event.metadata.userId;
        const packageId = event.metadata.packageId;
        if (!userIdRaw || !packageId) {
            throw new Error('STRIPE_WEBHOOK_METADATA_MISSING');
        }
        const pkg = findCreditPackage(packageId);
        if (!pkg) {
            throw new Error('UNKNOWN_CREDIT_PACKAGE');
        }
        await this.creditRepo.addCredits(BigInt(userIdRaw), pkg.credits, 'PURCHASE', event.referenceId);
    }
}
