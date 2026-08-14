import crypto from 'crypto';

/**
 * Recursively sorts object keys so two structurally-equal objects with
 * differently-ordered keys hash to the same value. Arrays keep their order
 * (order is meaningful there — e.g. a list of section boundaries).
 */
function sortDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortDeep);
    }
    if (value !== null && typeof value === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
            sorted[key] = sortDeep((value as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return value;
}

export interface SegmentRange {
    startSec: number;
    endSec: number;
}

export interface RecipeHashInput {
    type: string;
    params: Record<string, unknown>;
    segmentRange: SegmentRange | null;
    // WP2.1 — bắt buộc, không phải optional. Xem ghi chú 1, mục 3
    // docs/design/ai-personalization-economics.md: thiếu modelVersion trong
    // hash làm việc nâng cấp model sau này không bao giờ bust được cache
    // SHARED_FREE — mọi người vẫn nhận mãi output từ model cũ.
    modelVersion: string;
}

/**
 * WP2.1 — recipeHash = hash(type, params, segmentRange, modelVersion).
 * Dùng cả cho khoá cache SHARED_FREE lẫn để so khớp "có ai SHARED-BYOK cùng
 * recipe chưa" (mục 4 economics doc).
 */
export class RecipeHash {
    static compute(input: RecipeHashInput): string {
        const canonical = JSON.stringify(sortDeep({
            type: input.type,
            params: input.params,
            segmentRange: input.segmentRange,
            modelVersion: input.modelVersion,
        }));
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }
}
