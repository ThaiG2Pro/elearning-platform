/**
 * WP4.1 (Checkpoint 4) — cắm thanh toán thật vào nhánh UX #4 đã có sẵn từ
 * Checkpoint 3 (mục 4 economics doc): user không có BYOK, muốn tuỳ biến,
 * không có bản SHARED-BYOK trùng → 1 trong 2 lựa chọn: "Nhập API key miễn
 * phí" (BYOK) hoặc "Trả phí để nền tảng tạo giúp" (credit).
 *
 * Bán theo GÓI CREDIT, không pay-per-generation lẻ tẻ (mục 7 economics doc —
 * phí xử lý thanh toán ~2.9%+phí cố định ăn mòn doanh thu giao dịch nhỏ).
 * Toàn bộ file này là pure logic — không chạm DB/HTTP/Stripe SDK, test được
 * không cần fixture nào, đúng pattern AIGenerationPolicy.ts.
 */

export interface CreditPackage {
    id: string;
    /** Số credit user nhận được khi mua gói này. */
    credits: number;
    /** Giá bằng USD cent (đơn vị Stripe dùng, tránh sai số float). */
    priceUsdCents: number;
    label: string;
}

// 3 gói cố định — đơn giản hoá MVP, không để user tự nhập số tiền tuỳ ý
// (tránh phải xử lý mọi mức giá ở Stripe Checkout). Giá ước lượng đủ bù chi
// phí LLM cho 1 lần generate PAID_TIER (mục 7) + biên an toàn.
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
    { id: 'starter', credits: 20, priceUsdCents: 199, label: '20 credit — $1.99' },
    { id: 'standard', credits: 120, priceUsdCents: 999, label: '120 credit — $9.99' },
    { id: 'bulk', credits: 300, priceUsdCents: 1999, label: '300 credit — $19.99' },
] as const;

export function findCreditPackage(packageId: string): CreditPackage | undefined {
    return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

// Chi phí credit cố định cho 1 lần generate PAID_TIER — không phân biệt
// summary/quiz/độ dài ở Checkpoint 4 (đơn giản hoá MVP, khác hẳn ngưỡng token
// thực ở mục 6.3 chỉ áp dụng cho SHARED_FREE). Đọc từ env để chỉnh giá không
// cần deploy lại code.
export function aiGenerationCreditCost(): number {
    return Number(process.env.AI_GENERATION_CREDIT_COST ?? 10);
}

export type CreditTransactionReason = 'PURCHASE' | 'AI_GENERATION_SPEND' | 'REFUND';

export class CreditLedger {
    /** Mua credit — luôn cộng, không bao giờ âm. */
    static balanceAfterPurchase(currentBalance: number, packageCredits: number): number {
        return currentBalance + packageCredits;
    }

    /**
     * Tiêu credit cho 1 lần generate PAID_TIER — không bao giờ để số dư âm.
     * Tầng repository chịu trách nhiệm đọc số dư mới nhất trong cùng 1 DB
     * transaction trước khi gọi hàm này (chống race 2 request đồng thời).
     */
    static balanceAfterSpend(currentBalance: number, cost: number): number {
        if (currentBalance < cost) {
            throw new Error('AI_INSUFFICIENT_CREDITS');
        }
        return currentBalance - cost;
    }

    /** Hoàn credit khi generate PAID_TIER thất bại sau khi đã trừ tiền. */
    static balanceAfterRefund(currentBalance: number, refundAmount: number): number {
        return currentBalance + refundAmount;
    }

    static hasSufficientCredits(currentBalance: number, cost: number): boolean {
        return currentBalance >= cost;
    }
}
