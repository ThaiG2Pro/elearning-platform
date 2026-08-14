import { GoogleGenAI } from '@google/genai';
import { GenerateOptions, LLMGenerationError, LLMProvider } from './LLMProvider';
import { MODEL_VERSION } from '../domain/Recipes';

/**
 * WP2.2 — implementation đầu tiên của `LLMProvider`, dùng `@google/genai`
 * (SDK hiện hành, thay `@google/generative-ai` đã deprecated — xem
 * ai-integration-plan.md mục 2). Không hard-code số quota cụ thể: lỗi 429
 * được bọc lại thành `LLMGenerationError` rõ ràng, để tầng service quyết
 * định retry/thông báo, không tự fallback ngầm sang nguồn chi phí khác
 * (mục 6.2 economics doc).
 */
export class GeminiProvider implements LLMProvider {
    async generate(options: GenerateOptions): Promise<string> {
        const client = new GoogleGenAI({ apiKey: options.apiKey });
        try {
            const response = await client.models.generateContent({
                model: MODEL_VERSION,
                contents: options.prompt,
            });
            const text = response.text;
            if (!text) {
                throw new LLMGenerationError('GEMINI_EMPTY_RESPONSE');
            }
            return text;
        } catch (error) {
            if (error instanceof LLMGenerationError) {
                throw error;
            }
            throw new LLMGenerationError('GEMINI_GENERATION_FAILED', error);
        }
    }
}
