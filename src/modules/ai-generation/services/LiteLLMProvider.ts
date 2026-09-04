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
/**
 * 2026-09-04 — 1 số model (reasoning model, vd Qwen3.x qua Groq) không tách
 * chain-of-thought ra field `reasoning_content` riêng như OpenAI/Anthropic
 * mà in thẳng khối `<think>...</think>` vào đầu `message.content`, TRƯỚC
 * câu trả lời thật. `parseAIQuizContent`/UI tóm tắt phía client đều giả định
 * `content` là câu trả lời cuối (JSON thuần hoặc code-fence) — không tự bóc
 * `<think>` — nên nếu admin đổi model mặc định sang 1 reasoning model kiểu
 * này, mọi thứ lại lỗi y hệt (AI_QUIZ_UNPARSEABLE, tóm tắt hiện đầy nội dung
 * suy luận rác). Bóc khối `<think>` ngay tại nguồn provider, chỗ DUY NHẤT
 * biết hình dạng thật của response — để service/client phía trên không cần
 * biết provider có phải reasoning model hay không.
 */
function stripThinkBlocks(text: string): string {
    // Khối đóng đủ cặp trước.
    let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // `<think>` mở nhưng không có `</think>` đóng (bị cắt cụt vì hết
    // max_tokens giữa lúc suy luận, xem finish_reason=length) — bỏ từ đó về
    // cuối vì phần còn lại chắc chắn chỉ toàn suy luận dở dang, không có câu
    // trả lời thật nào theo sau.
    out = out.replace(/<think>[\s\S]*$/i, '');
    return out.trim();
}

export class LiteLLMProvider implements LLMProvider {
    async generate(options: GenerateOptions): Promise<string> {
        // WP3.1 — BYOK truyền baseUrl/model riêng (endpoint của chính user);
        // không truyền = nhánh SHARED_FREE, dùng proxy + model mặc định của
        // nền tảng như trước.
        const baseURL = options.baseUrl ?? process.env.LITELLM_BASE_URL;
        if (!baseURL) {
            throw new LLMGenerationError('LITELLM_NOT_CONFIGURED');
        }
        const model = options.model ?? defaultModel();

        const client = new OpenAI({ apiKey: options.apiKey, baseURL });
        try {
            const response = await client.chat.completions.create({
                model,
                messages: [{ role: 'user', content: options.prompt }],
            });
            const rawText = response.choices[0]?.message?.content;
            if (!rawText) {
                throw new LLMGenerationError('LITELLM_EMPTY_RESPONSE');
            }
            const text = stripThinkBlocks(rawText);
            // Toàn bộ nội dung chỉ là <think> chưa đóng (cụt vì hết
            // max_tokens) — không có gì dùng được, fail rõ ràng thay vì trả
            // chuỗi rỗng cho tầng trên tưởng nhầm là câu trả lời hợp lệ.
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
