/**
 * WP2.1/2.2 — luật routing chi phí AI, đúng nguyên tắc bao trùm duy nhất ở
 * docs/design/ai-personalization-economics.md mục 0:
 *   BYOK của chính user → cache dùng chung (recipe mặc định) → trả phí cho
 *   nền tảng gánh → nếu không thoả điều nào, chặn và yêu cầu chọn 1 trong 2.
 * Toàn bộ file này là pure logic — không chạm DB/HTTP, nên test được không
 * cần fixture DB.
 */

export type KeySource = 'SHARED_FREE' | 'BYOK' | 'PAID_TIER';
export type Visibility = 'PRIVATE' | 'SHARED';

export interface RoutingRequest {
    hasByokKey: boolean;
    isDefaultRecipe: boolean;
    /** Đã có bản cache SHARED_FREE cho đúng (sourceId, recipeHash) mặc định? */
    hasDefaultCache: boolean;
    /** Đã có ai SHARED bản BYOK trùng recipeHash tuỳ biến này chưa? */
    hasSharedByokMatch: boolean;
}

export type RoutingDecision =
    | { action: 'GENERATE'; keySource: 'BYOK' }
    | { action: 'USE_CACHE'; keySource: 'SHARED_FREE' }
    | { action: 'GENERATE'; keySource: 'SHARED_FREE' }
    | { action: 'USE_CACHE'; keySource: 'BYOK' }
    | { action: 'CHOICE_REQUIRED' };

export class AIGenerationPolicy {
    /**
     * 4 nhánh cố định ở mục 4 economics doc — không nhánh nào mơ hồ. Bản
     * PAID_TIER trùng recipe KHÔNG bao giờ được coi là "match" ở nhánh 3 (mục
     * 5 free-rider fix) — chỉ SHARED-BYOK mới được tái dùng free.
     */
    static decideRouting(req: RoutingRequest): RoutingDecision {
        if (req.hasByokKey) {
            return { action: 'GENERATE', keySource: 'BYOK' };
        }
        if (req.isDefaultRecipe) {
            return req.hasDefaultCache
                ? { action: 'USE_CACHE', keySource: 'SHARED_FREE' }
                : { action: 'GENERATE', keySource: 'SHARED_FREE' };
        }
        if (req.hasSharedByokMatch) {
            return { action: 'USE_CACHE', keySource: 'BYOK' };
        }
        return { action: 'CHOICE_REQUIRED' };
    }

    /**
     * Mục 5 — fix free-rider: chỉ bản BYOK mới được user tự chọn SHARED.
     * PAID_TIER luôn bị ép cứng PRIVATE ở tầng logic, không cho tuỳ chọn —
     * nếu không, free-rider giết chết động lực trả phí.
     */
    static resolveVisibility(keySource: KeySource, userRequestedShared: boolean): Visibility {
        if (keySource === 'PAID_TIER') {
            return 'PRIVATE';
        }
        if (keySource === 'SHARED_FREE') {
            // Bản mặc định luôn dùng chung — đây chính là mục đích của nó.
            return 'SHARED';
        }
        return userRequestedShared ? 'SHARED' : 'PRIVATE';
    }

    /**
     * Ranh giới default/custom (mục 2) — đổi BẤT KỲ tham số nào, kể cả chỉ
     * đổi segment/khoảng thời gian, lập tức rời khỏi "mặc định".
     */
    static isDefaultRecipe(
        params: Record<string, unknown>,
        segmentRange: unknown,
        defaultParams: Record<string, unknown>,
    ): boolean {
        if (segmentRange !== null && segmentRange !== undefined) {
            return false;
        }
        return JSON.stringify(sortKeys(params)) === JSON.stringify(sortKeys(defaultParams));
    }

    /**
     * Hệ quả mục 5 — fork/clone course không kế thừa AIGeneration
     * PAID_TIER: người fork phải tự tạo lại nếu muốn bản tương đương.
     */
    static inheritOnClone(sourceGenerationKeySource: KeySource | null): boolean {
        return sourceGenerationKeySource !== null && sourceGenerationKeySource !== 'PAID_TIER';
    }

    /**
     * Mục 6.1 — chống cost-DoS: giới hạn số Source mới/user/ngày được phép
     * kích hoạt AI lần đầu. Đếm được tính ở tầng repository/service (đọc
     * created_at hôm nay theo generated_by_user_id); policy chỉ giữ ngưỡng.
     */
    static enforceDailyActivationLimit(activationsToday: number, dailyLimit: number): void {
        if (activationsToday >= dailyLimit) {
            throw new Error('AI_DAILY_RATE_LIMIT_EXCEEDED');
        }
    }

    /**
     * Mục 6.3 — quota tính theo chi phí thực (ước lượng token), không theo
     * lượt: video quá dài bị từ chối tạo bản SHARED_FREE, bắt buộc BYOK/trả
     * phí ngay từ đầu thay vì âm thầm đốt ngân sách chung.
     */
    static enforceSharedFreeTokenBudget(estimatedTokens: number, maxTokensForSharedFree: number): void {
        if (estimatedTokens > maxTokensForSharedFree) {
            throw new Error('SOURCE_TOO_LONG_FOR_SHARED_FREE');
        }
    }
}

function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value !== null && typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
            sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return value;
}
