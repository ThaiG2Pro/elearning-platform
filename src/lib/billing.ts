import api from './api';

export interface CreditPackageOption {
    id: string;
    credits: number;
    priceUsdCents: number;
    label: string;
}

// WP4.1 — mirror của CREDIT_PACKAGES ở src/modules/billing/domain/CreditLedger.ts.
// Không import trực tiếp (module đó nằm ngoài phạm vi client bundle, chỉ
// dùng ở server); giữ 1 danh sách nhỏ, tay đôi bên, y hệt cách
// AI_DAILY_ACTIVATION_LIMIT hiển thị số cứng ở UI cũ.
export const CREDIT_PACKAGE_OPTIONS: readonly CreditPackageOption[] = [
    { id: 'starter', credits: 20, priceUsdCents: 199, label: '20 credit — $1.99' },
    { id: 'standard', credits: 120, priceUsdCents: 999, label: '120 credit — $9.99' },
    { id: 'bulk', credits: 300, priceUsdCents: 1999, label: '300 credit — $19.99' },
];

export const getCreditBalance = async (): Promise<number> => {
    const response = await api.get('/billing/balance');
    return response.data.creditBalance as number;
};

/** WP4.1 — trả về URL Stripe Checkout hosted, frontend redirect thẳng sang đó. */
export const createCheckoutSession = async (packageId: string): Promise<string> => {
    const response = await api.post('/billing/checkout', { packageId });
    return response.data.checkoutUrl as string;
};
