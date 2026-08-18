/**
 * WP2.2 — 1 interface duy nhất cho mọi LLM (ai-integration-plan.md mục 2):
 * BYOK không cần đổi kiến trúc, chỉ khác ở `apiKey` truyền vào. Routing/
 * cache/quota (AIGenerationPolicy) chỉ quan tâm `keySource`, không quan tâm
 * provider cụ thể.
 */
export interface GenerateOptions {
    apiKey: string;
    prompt: string;
    /**
     * WP3.1 — BYOK: khi có, gọi thẳng endpoint OpenAI-compatible này (provider
     * thật của user hoặc proxy LiteLLM riêng của họ) thay vì proxy dùng chung
     * của nền tảng. Không set = nhánh SHARED_FREE, dùng `LITELLM_BASE_URL` +
     * `defaultModel()` mặc định.
     */
    baseUrl?: string;
    model?: string;
}

export interface LLMProvider {
    generate(options: GenerateOptions): Promise<string>;
}

export class LLMGenerationError extends Error {
    readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = 'LLMGenerationError';
        this.cause = cause;
    }
}
