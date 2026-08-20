import { prisma } from '../../../shared/config/database';
import { BillingService, CreateCheckoutSessionRequest } from '../services/BillingService';
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

    async createCheckoutSession(req: CreateCheckoutSessionRequest): Promise<{ checkoutUrl: string }> {
        return this.service.createCheckoutSession(req);
    }

    async handleWebhook(rawBody: string, signatureHeader: string | null): Promise<void> {
        return this.service.handleWebhook(rawBody, signatureHeader);
    }
}
