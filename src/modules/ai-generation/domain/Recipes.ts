/**
 * WP2.2 — "Recipe mặc định" (mục 2 economics doc): 1 cấu hình duy nhất, cố
 * định, do hệ thống quyết định. User không được chọn tham số cho bản mặc
 * định — đổi bất kỳ giá trị nào ở đây không còn là "mặc định" nữa.
 *
 * Slice tối thiểu Checkpoint 2 (ai-integration-plan.md mục 3): đúng 2 recipe,
 * không mở rộng flashcard/mindmap/chat.
 */

export type RecipeType = 'summary' | 'quiz';

export const MODEL_VERSION = 'gemini-2.5-flash';

export const DEFAULT_RECIPE_PARAMS: Record<RecipeType, Record<string, unknown>> = {
    summary: {
        length: 'standard',
        language: 'vi',
    },
    quiz: {
        questionCount: 10,
        difficulty: 'medium',
        language: 'vi',
    },
};

export function defaultParamsFor(type: RecipeType): Record<string, unknown> {
    return DEFAULT_RECIPE_PARAMS[type];
}
