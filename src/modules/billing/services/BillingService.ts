import { PrismaClient } from '@prisma/client';
import { CreditLedger, CreditTransactionReason, aiGenerationCreditCost, findCreditPackage } from '../domain/CreditLedger';
import { CreditRepository } from '../repositories/CreditRepository';
import { ChargeRefundedEvent, DisputeClosedEvent, DisputeCreatedEvent, PaymentProvider } from './PaymentProvider';
import { sendOpsAlert } from '../../../shared/ops/alert';

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
export interface CreditTransactionView {
    id: string;
    amount: number;
    reason: CreditTransactionReason;
    balanceAfter: number;
    createdAt: string;
    /** Lượt AI mà dòng này trả tiền/hoàn cho — null với PURCHASE/Stripe/tay. */
    generation: { id: string; recipeType: string; sourceTitle: string | null; status: string } | null;
    note: string | null;
}

export class BillingService {
    constructor(
        private prisma: PrismaClient,
        private creditRepo: CreditRepository,
        private paymentProvider: PaymentProvider,
    ) { }

    /** 2026-09-15 — số dư + chi phí mỗi lượt, để UI nói "còn N, lượt này trừ M". */
    async getCreditSummary(userId: bigint): Promise<{ creditBalance: number; creditCostPerGeneration: number }> {
        return {
            creditBalance: await this.creditRepo.getBalance(userId),
            creditCostPerGeneration: aiGenerationCreditCost(),
        };
    }

    /**
     * 2026-09-15 — lịch sử giao dịch cho trang /billing: người trả tiền phải
     * tự đối soát được tiền của họ. Kèm bài học liên quan cho dòng SPEND/REFUND.
     */
    async listTransactions(
        userId: bigint,
        limit: number,
        cursor?: bigint,
    ): Promise<{ items: CreditTransactionView[]; nextCursor: string | null }> {
        const safeLimit = Math.min(Math.max(limit, 1), 50);
        const rows = await this.creditRepo.listTransactions(userId, safeLimit + 1, cursor);
        const page = rows.slice(0, safeLimit);
        const nextCursor = rows.length > safeLimit ? page[page.length - 1].id.toString() : null;

        const generationIds = [...new Set(page.map((r) => r.aiGenerationId).filter((id): id is bigint => id !== null))];
        const generations = generationIds.length
            ? await this.prisma.ai_generations.findMany({
                where: { id: { in: generationIds } },
                select: { id: true, recipe_type: true, status: true, source: { select: { title: true } } },
            })
            : [];
        const byId = new Map(generations.map((g) => [g.id, g]));

        return {
            items: page.map((r) => {
                const g = r.aiGenerationId !== null ? byId.get(r.aiGenerationId) : undefined;
                return {
                    id: r.id.toString(),
                    amount: r.amount,
                    reason: r.reason,
                    balanceAfter: r.balanceAfter,
                    createdAt: r.createdAt.toISOString(),
                    generation: g
                        ? { id: g.id.toString(), recipeType: g.recipe_type, sourceTitle: g.source?.title ?? null, status: g.status }
                        : null,
                    note: r.note,
                };
            }),
            nextCursor,
        };
    }

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
        switch (event.kind) {
            case 'checkout_completed':
                break;
            case 'charge_refunded':
                return this.handleChargeRefunded(event);
            case 'dispute_created':
                return this.handleDisputeCreated(event);
            case 'dispute_closed':
                return this.handleDisputeClosed(event);
            default:
                return;
        }
        // Security fix: session "completed" với payment_status != 'paid'
        // (phương thức trả chậm chưa thu được tiền) từng vẫn được cộng credit.
        // Trả về 200 (không throw) để Stripe không retry vô ích — nếu sau đó
        // tiền về, Stripe gửi event async_payment_succeeded riêng (chưa hỗ
        // trợ; Checkout của hệ thống chỉ bật thẻ nên thực tế luôn 'paid').
        if (event.paymentStatus !== 'paid') {
            console.warn('Stripe webhook: checkout.session.completed but payment_status is not paid — no credits added', {
                referenceId: event.referenceId,
                paymentStatus: event.paymentStatus,
            });
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
        await this.creditRepo.addCredits(BigInt(userIdRaw), pkg.credits, 'PURCHASE', event.referenceId, event.paymentIntentId);
    }

    /**
     * 2026-09-15 — Stripe hoàn tiền (từ Dashboard hoặc API): thu hồi credit
     * theo tỉ lệ TỔNG đã hoàn, trừ đi phần đã thu hồi trước đó cho cùng gói
     * (refund từng phần nhiều lần, hoặc refund chồng lên dispute). Nhờ vậy
     * không bao giờ thu hồi trùng và tổng thu hồi không vượt số credit gói.
     * Số dư có thể âm nếu khách đã tiêu — là nợ.
     * Không tìm được gói (PaymentIntent lạ, hoặc mua trước khi có cột
     * stripe_payment_intent) → không đoán, chỉ cảnh báo để người xử lý tay.
     */
    private async handleChargeRefunded(event: ChargeRefundedEvent): Promise<void> {
        const purchase = event.paymentIntentId
            ? await this.creditRepo.findPurchaseByPaymentIntent(event.paymentIntentId)
            : null;
        if (!purchase || !event.paymentIntentId) {
            await sendOpsAlert('Stripe refund không khớp gói nào — cần xử lý tay', {
                refundId: event.refundId,
                paymentIntentId: event.paymentIntentId,
                refundedCents: event.refundedCents,
            });
            return;
        }
        const target = CreditLedger.clawbackForRefund(purchase.credits, event.refundedCents, event.chargeCents);
        const alreadyClawed = -(await this.creditRepo.sumStripeAdjustmentsForPurchase(event.paymentIntentId));
        const delta = Math.min(target, purchase.credits) - alreadyClawed;
        if (delta <= 0) return;
        const balance = await this.creditRepo.adjustCreditsForStripeEvent(
            purchase.userId,
            -delta,
            'STRIPE_REFUND_CLAWBACK',
            event.refundId,
            event.paymentIntentId,
        );
        await sendOpsAlert('Stripe hoàn tiền → đã thu hồi credit', {
            userId: purchase.userId,
            refundId: event.refundId,
            refundedCentsTotal: event.refundedCents,
            chargeCents: event.chargeCents,
            clawbackThisTime: delta,
            clawbackTotal: alreadyClawed + delta,
            balanceAfter: balance,
        });
    }

    /**
     * Chargeback: Stripe rút tiền + phí tranh chấp ngay khi mở → thu hồi phần
     * credit CÒN LẠI chưa bị thu hồi của gói (nếu đã refund một phần trước đó
     * thì chỉ lấy nốt). Thắng thì trả lại đúng phần này ở closed.
     */
    private async handleDisputeCreated(event: DisputeCreatedEvent): Promise<void> {
        const purchase = event.paymentIntentId
            ? await this.creditRepo.findPurchaseByPaymentIntent(event.paymentIntentId)
            : null;
        if (!purchase || !event.paymentIntentId) {
            await sendOpsAlert('Stripe dispute không khớp gói nào — cần xử lý tay', {
                disputeId: event.disputeId,
                paymentIntentId: event.paymentIntentId,
                amountCents: event.amountCents,
            });
            return;
        }
        const alreadyClawed = -(await this.creditRepo.sumStripeAdjustmentsForPurchase(event.paymentIntentId));
        const delta = purchase.credits - alreadyClawed;
        if (delta <= 0) {
            await sendOpsAlert('Chargeback mở nhưng credit gói đã bị thu hồi hết trước đó — không trừ thêm', {
                userId: purchase.userId,
                disputeId: event.disputeId,
            });
            return;
        }
        const balance = await this.creditRepo.adjustCreditsForStripeEvent(
            purchase.userId,
            -delta,
            'DISPUTE_CLAWBACK',
            event.disputeId,
            event.paymentIntentId,
        );
        await sendOpsAlert('Chargeback mở → đã thu hồi credit gói', {
            userId: purchase.userId,
            disputeId: event.disputeId,
            amountCents: event.amountCents,
            clawback: delta,
            balanceAfter: balance,
        });
    }

    /**
     * Thắng tranh chấp: trả lại ĐÚNG phần DISPUTE_CLAWBACK của dispute này
     * (tra theo dispute id). Chưa từng thu hồi (webhook created bị bỏ lỡ,
     * hoặc dispute cho gói lạ) → KHÔNG cộng gì — nếu không, một dispute
     * "thắng" cho gói không hề bị trừ sẽ in credit từ hư không.
     */
    private async handleDisputeClosed(event: DisputeClosedEvent): Promise<void> {
        if (event.status !== 'won') {
            await sendOpsAlert('Chargeback đóng, không thắng — credit đã thu hồi giữ nguyên', {
                disputeId: event.disputeId,
                status: event.status,
            });
            return;
        }
        const clawback = await this.creditRepo.findByStripeReference(event.disputeId);
        if (!clawback || clawback.amount >= 0) {
            await sendOpsAlert('Thắng dispute nhưng không có dòng thu hồi tương ứng — không tự trả credit, xem tay', {
                disputeId: event.disputeId,
                paymentIntentId: event.paymentIntentId,
            });
            return;
        }
        const restore = -clawback.amount;
        const balance = await this.creditRepo.adjustCreditsForStripeEvent(
            clawback.userId,
            restore,
            'DISPUTE_WON_RESTORE',
            `${event.disputeId}:won`,
            event.paymentIntentId,
        );
        await sendOpsAlert('Thắng chargeback → đã trả lại credit', {
            userId: clawback.userId,
            disputeId: event.disputeId,
            restored: restore,
            balanceAfter: balance,
        });
    }
}
