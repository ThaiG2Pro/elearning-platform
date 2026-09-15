import { prisma } from '../../../shared/config/database';
import { BillingService, CreateCheckoutSessionRequest, CreditTransactionView } from '../services/BillingService';
import { CreditRepository } from '../repositories/CreditRepository';
import { StripePaymentProvider } from '../services/StripePaymentProvider';

export class BillingController {
    private service: BillingService;
    private creditRepo: CreditRepository;

    constructor() {
        this.creditRepo = new CreditRepository(prisma);
        this.service = new BillingService(prisma, this.creditRepo, new StripePaymentProvider());
    }

    async getBalance(userId: bigint): Promise<number> {
        return this.creditRepo.getBalance(userId);
    }

    async getCreditSummary(userId: bigint): Promise<{ creditBalance: number; creditCostPerGeneration: number }> {
        return this.service.getCreditSummary(userId);
    }

    async listTransactions(
        userId: bigint,
        limit: number,
        cursor?: bigint,
    ): Promise<{ items: CreditTransactionView[]; nextCursor: string | null }> {
        return this.service.listTransactions(userId, limit, cursor);
    }

    async createCheckoutSession(req: CreateCheckoutSessionRequest): Promise<{ checkoutUrl: string }> {
        return this.service.createCheckoutSession(req);
    }

    async handleWebhook(rawBody: string, signatureHeader: string | null): Promise<void> {
        return this.service.handleWebhook(rawBody, signatureHeader);
    }
}
