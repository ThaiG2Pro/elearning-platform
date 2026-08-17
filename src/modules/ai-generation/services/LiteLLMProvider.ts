import OpenAI from 'openai';
import { GenerateOptions, LLMGenerationError, LLMProvider } from './LLMProvider';
import { defaultModel } from '../domain/Recipes';

/**
 * WP2.2 (revised) — implementation duy nhất của `LLMProvider`, nói chuyện
 * qua LiteLLM proxy (self-host, xem `litellm/config.yaml` +
 * `docker-compose.yml`) thay vì gọi thẳng 1 SDK provider cụ thể. LiteLLM
 * proxy expose đúng API OpenAI-compatible, nên chỉ cần SDK `openai` trỏ
 * `baseURL` về proxy — đổi provider (Groq/OpenAI/Anthropic/OpenRouter/tự
 * host) chỉ là đổi entry trong config.yaml, không đụng file này.
 *
 * `options.apiKey` là key gọi tới CHÍNH proxy (không phải key riêng của
 * provider): nhánh SHARED_FREE dùng `LITELLM_MASTER_KEY` của nền tảng,
 * nhánh BYOK dùng key user tự cấu hình cho 1 proxy LiteLLM họ tự chạy (hoặc
 * virtual key nếu vận hành cấp riêng sau này — xem ROADMAP WP2.2 ghi chú
 * BYOK).
 */
export class LiteLLMProvider implements LLMProvider {
    async generate(options: GenerateOptions): Promise<string> {
        const baseURL = process.env.LITELLM_BASE_URL;
        if (!baseURL) {
            throw new LLMGenerationError('LITELLM_NOT_CONFIGURED');
        }

        const client = new OpenAI({ apiKey: options.apiKey, baseURL });
        try {
            const response = await client.chat.completions.create({
                model: defaultModel(),
                messages: [{ role: 'user', content: options.prompt }],
            });
            const text = response.choices[0]?.message?.content;
            if (!text) {
                throw new LLMGenerationError('LITELLM_EMPTY_RESPONSE');
            }
            return text;
        } catch (error) {
            if (error instanceof LLMGenerationError) {
                throw error;
            }
            throw new LLMGenerationError('LITELLM_GENERATION_FAILED', error);
        }
    }
}
