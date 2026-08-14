/**
 * WP2.2 — 1 interface duy nhất cho mọi LLM (ai-integration-plan.md mục 2):
 * BYOK không cần đổi kiến trúc, chỉ khác ở `apiKey` truyền vào. Routing/
 * cache/quota (AIGenerationPolicy) chỉ quan tâm `keySource`, không quan tâm
 * provider cụ thể.
 */
export interface GenerateOptions {
    apiKey: string;
    prompt: string;
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
