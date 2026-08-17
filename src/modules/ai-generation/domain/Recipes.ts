/**
 * WP2.2 — "Recipe mặc định" (mục 2 economics doc): 1 cấu hình duy nhất, cố
 * định, do hệ thống quyết định. User không được chọn tham số cho bản mặc
 * định — đổi bất kỳ giá trị nào ở đây không còn là "mặc định" nữa.
 *
 * Slice tối thiểu Checkpoint 2 (ai-integration-plan.md mục 3): đúng 2 recipe,
 * không mở rộng flashcard/mindmap/chat.
 */

export type RecipeType = 'summary' | 'quiz';

/**
 * WP2.2 (revised) — model alias gọi qua LiteLLM proxy (xem
 * `litellm/config.yaml`), đọc từ env thay vì hard-code 1 provider cụ thể —
 * đổi provider (Groq/OpenAI/Anthropic/OpenRouter/tự host) chỉ cần đổi
 * `AI_DEFAULT_MODEL` + entry tương ứng trong config.yaml, không sửa code.
 * Đọc lại mỗi lần gọi (không cache module-scope) để test chỉnh động được,
 * cùng lý do với `dailyActivationLimit()`/`sharedFreeMaxTranscriptChars()`
 * ở AIGenerationService.
 *
 * Vẫn bắt buộc nằm trong `recipeHash` (ghi chú 1, mục 3 economics doc):
 * đổi provider/model qua env này tự động tạo cache-miss có kiểm soát cho
 * SHARED_FREE, không phục vụ mãi output từ model cũ.
 */
export function defaultModel(): string {
    return process.env.AI_DEFAULT_MODEL ?? 'default';
}

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
