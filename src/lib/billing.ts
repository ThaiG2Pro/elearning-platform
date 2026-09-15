import api from './api';

export interface CreditPackageOption {
    id: string;
    credits: number;
    priceUsdCents: number;
    label: string;
    /** Gói được làm nổi trên UI — gói có giá mỗi credit thấp nhất. */
    recommended?: boolean;
}

// WP4.1 — mirror của CREDIT_PACKAGES ở src/modules/billing/domain/CreditLedger.ts.
// Không import trực tiếp (module đó nằm ngoài phạm vi client bundle, chỉ
// dùng ở server); giữ 1 danh sách nhỏ, tay đôi bên, y hệt cách
// AI_DAILY_ACTIVATION_LIMIT hiển thị số cứng ở UI cũ.
export const CREDIT_PACKAGE_OPTIONS: readonly CreditPackageOption[] = [
    { id: 'starter', credits: 10, priceUsdCents: 100, label: '10 credit — $1.00' },
    { id: 'standard', credits: 30, priceUsdCents: 300, label: '30 credit — $3.00' },
    { id: 'bulk', credits: 75, priceUsdCents: 500, label: '75 credit — $5.00', recommended: true },
];

export interface CreditSummary {
    creditBalance: number;
    /** Số credit trừ cho 1 lượt AI soạn theo yêu cầu riêng (server quyết định). */
    creditCostPerGeneration: number;
}

export const getCreditSummary = async (): Promise<CreditSummary> => {
    const response = await api.get('/billing/balance');
    return response.data as CreditSummary;
};

export const getCreditBalance = async (): Promise<number> => (await getCreditSummary()).creditBalance;

export type CreditTransactionReason =
    | 'PURCHASE'
    | 'AI_GENERATION_SPEND'
    | 'REFUND'
    | 'STRIPE_REFUND_CLAWBACK'
    | 'DISPUTE_CLAWBACK'
    | 'DISPUTE_WON_RESTORE'
    | 'MANUAL_ADJUSTMENT';

export interface CreditTransaction {
    id: string;
    amount: number;
    reason: CreditTransactionReason;
    balanceAfter: number;
    createdAt: string;
    generation: { id: string; recipeType: string; sourceTitle: string | null; status: string } | null;
    note: string | null;
}

export const listCreditTransactions = async (
    cursor?: string,
    limit = 20,
): Promise<{ items: CreditTransaction[]; nextCursor: string | null }> => {
    const response = await api.get('/billing/transactions', { params: { cursor, limit } });
    return response.data;
};

/** Nhãn người dùng đọc được cho từng lý do trong sổ cái — 1 nơi duy nhất. */
export const CREDIT_REASON_LABELS: Record<CreditTransactionReason, string> = {
    PURCHASE: 'Mua gói credit',
    AI_GENERATION_SPEND: 'AI soạn theo yêu cầu riêng',
    REFUND: 'Hoàn lại vì AI lỗi',
    STRIPE_REFUND_CLAWBACK: 'Thu hồi do hoàn tiền',
    DISPUTE_CLAWBACK: 'Thu hồi do khiếu nại thẻ',
    DISPUTE_WON_RESTORE: 'Trả lại sau khiếu nại thẻ',
    MANUAL_ADJUSTMENT: 'Điều chỉnh bởi đội hỗ trợ',
};

/** WP4.1 — trả về URL Stripe Checkout hosted, frontend redirect thẳng sang đó. */
export const createCheckoutSession = async (packageId: string): Promise<string> => {
    const response = await api.post('/billing/checkout', { packageId });
    return response.data.checkoutUrl as string;
};
