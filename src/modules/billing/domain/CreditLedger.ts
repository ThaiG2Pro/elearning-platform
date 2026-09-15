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
// (tránh phải xử lý mọi mức giá ở Stripe Checkout).
//
// Định giá lại 2026-09-14. Bảng cũ ($1.99/20, $9.99/120, $19.99/300 với
// 10 credit/lượt = $1/lượt) đắt gấp ~200 lần chi phí LLM thật (gpt-oss-120b
// qua Groq, transcript tối đa 60k ký tự ≈ $0.003–0.005/lượt) và vượt xa mức
// người tự học ở VN sẵn sàng trả. Giờ: 1 credit = 1 lượt, giá lẻ nhỏ, và
// gói giữa là "chim mồi" — cùng giá mỗi lượt với gói nhỏ nhất để gói lớn
// nhất (rẻ hơn 33%/lượt) là lựa chọn hiển nhiên. Vẫn cao hơn chi phí LLM
// ~15–20 lần, đủ bù phí Stripe (2.9% + $0.30) và lượt lỗi phải hoàn.
//
// QUY TẮC KHI ĐỔI GÓI: webhook Stripe tra gói theo `metadata.packageId` LÚC
// THANH TOÁN XONG, còn Checkout Session sống tới 24h. Đổi credits/giá mà giữ
// nguyên id → session tạo trước deploy sẽ được cộng theo bảng MỚI (sai với
// số tiền đã thu). Đổi nội dung gói thì đổi luôn id (vd 'starter-v2'), giữ
// id cũ trong bảng ít nhất 24h rồi mới bỏ.
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
    { id: 'starter', credits: 10, priceUsdCents: 100, label: '10 credit — $1.00' },
    { id: 'standard', credits: 30, priceUsdCents: 300, label: '30 credit — $3.00' },
    { id: 'bulk', credits: 75, priceUsdCents: 500, label: '75 credit — $5.00' },
] as const;

export function findCreditPackage(packageId: string): CreditPackage | undefined {
    return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

// Chi phí credit cố định cho 1 lần generate PAID_TIER — không phân biệt
// summary/quiz/độ dài ở Checkpoint 4 (đơn giản hoá MVP, khác hẳn ngưỡng token
// thực ở mục 6.3 chỉ áp dụng cho SHARED_FREE). Đọc từ env để chỉnh giá không
// cần deploy lại code. Mặc định 1 (1 credit = 1 lượt) từ 2026-09-14, khớp
// bảng CREDIT_PACKAGES ở trên.
export const DEFAULT_AI_GENERATION_CREDIT_COST = 1;

export function aiGenerationCreditCost(): number {
    // Env sai/thiếu (rỗng, chữ, số âm, số lẻ) không được phép biến generate
    // thành miễn phí (0/NaN) hay "in" credit (âm) — rơi về mặc định.
    const parsed = Number(process.env.AI_GENERATION_CREDIT_COST ?? DEFAULT_AI_GENERATION_CREDIT_COST);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return DEFAULT_AI_GENERATION_CREDIT_COST;
    }
    return parsed;
}

export type CreditTransactionReason =
    | 'PURCHASE'
    | 'AI_GENERATION_SPEND'
    | 'REFUND'
    // 2026-09-15 — tiền ra do Stripe hoàn tiền / chargeback, tiền về khi thắng tranh chấp.
    | 'STRIPE_REFUND_CLAWBACK'
    | 'DISPUTE_CLAWBACK'
    | 'DISPUTE_WON_RESTORE'
    | 'MANUAL_ADJUSTMENT';

export class CreditLedger {
    /**
     * Mọi biến động credit phải là số nguyên dương hữu hạn — chặn tuyệt đối
     * số âm/NaN/số lẻ lọt vào ledger (spend số âm = in credit, purchase số âm
     * = âm thầm trừ tiền user).
     */
    static assertValidAmount(amount: number): void {
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('INVALID_CREDIT_AMOUNT');
        }
    }

    /** Mua credit — luôn cộng, không bao giờ âm. */
    static balanceAfterPurchase(currentBalance: number, packageCredits: number): number {
        CreditLedger.assertValidAmount(packageCredits);
        return currentBalance + packageCredits;
    }

    /**
     * Tiêu credit cho 1 lần generate PAID_TIER — không bao giờ để số dư âm.
     * Lưu ý: CreditRepository.spendCredits KHÔNG dùng hàm này nữa — điều kiện
     * đủ tiền được đặt thẳng trong câu UPDATE (WHERE credit_balance >= cost)
     * để Postgres quyết định atomically; hàm này giữ lại làm quy tắc nghiệp
     * vụ thuần (tính toán/hiển thị, test) chứ không phải hàng rào chống race.
     */
    static balanceAfterSpend(currentBalance: number, cost: number): number {
        CreditLedger.assertValidAmount(cost);
        if (currentBalance < cost) {
            throw new Error('AI_INSUFFICIENT_CREDITS');
        }
        return currentBalance - cost;
    }

    /** Hoàn credit khi generate PAID_TIER thất bại sau khi đã trừ tiền. */
    static balanceAfterRefund(currentBalance: number, refundAmount: number): number {
        CreditLedger.assertValidAmount(refundAmount);
        return currentBalance + refundAmount;
    }

    static hasSufficientCredits(currentBalance: number, cost: number): boolean {
        return currentBalance >= cost;
    }

    /**
     * 2026-09-15 — Stripe hoàn tiền cho 1 gói: thu hồi bao nhiêu credit.
     * Hoàn toàn bộ (hoặc hơn, do làm tròn) → thu hồi hết. Hoàn một phần →
     * theo tỉ lệ, làm tròn LÊN về phía nền tảng (khách được hoàn tiền thì
     * không được giữ phần credit lẻ). Không bao giờ vượt số credit đã cộng.
     */
    static clawbackForRefund(packageCredits: number, refundedCents: number, paidCents: number): number {
        CreditLedger.assertValidAmount(packageCredits);
        if (!Number.isFinite(refundedCents) || refundedCents <= 0) return 0;
        if (!Number.isFinite(paidCents) || paidCents <= 0 || refundedCents >= paidCents) return packageCredits;
        return Math.min(packageCredits, Math.ceil((packageCredits * refundedCents) / paidCents));
    }
}
