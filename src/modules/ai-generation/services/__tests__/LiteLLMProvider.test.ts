import { describe, it, expect, vi, beforeEach } from 'vitest';

// 2026-09-04 — reasoning model (vd Qwen qua Groq) in cả <think>...</think>
// thẳng vào message.content thay vì tách field reasoning_content riêng
// (xem litellm/config.yaml, đoạn ghi chú 2026-09-04 ở model `default`).
// LiteLLMProvider phải tự bóc khối này trước khi trả về, vì đây là chỗ
// DUY NHẤT biết hình dạng thật của response — service/client phía trên
// (parseAIQuizContent) không nên phải biết provider có phải reasoning
// model hay không.
let mockCreate = vi.fn();
vi.mock('openai', () => ({
    default: class MockOpenAI {
        chat = { completions: { create: (...args: unknown[]) => mockCreate(...args) } };
    },
}));

import { LiteLLMProvider } from '../LiteLLMProvider';
import { LLMGenerationError } from '../LLMProvider';

describe('LiteLLMProvider.generate — strip <think> reasoning blocks', () => {
    beforeEach(() => {
        mockCreate = vi.fn();
        process.env.LITELLM_BASE_URL = 'http://localhost:4000';
    });

    const run = () => new LiteLLMProvider().generate({ apiKey: 'k', prompt: 'p' });

    it('trả nguyên content khi model không chèn <think>', async () => {
        mockCreate.mockResolvedValue({ choices: [{ message: { content: '[{"content":"Q"}]' } }] });
        await expect(run()).resolves.toBe('[{"content":"Q"}]');
    });

    it('bóc khối <think>...</think> đã đóng đủ cặp, giữ lại câu trả lời thật phía sau', async () => {
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: '<think>suy luận dài dòng...</think>[{"content":"Q"}]' } }],
        });
        await expect(run()).resolves.toBe('[{"content":"Q"}]');
    });

    it('bỏ luôn từ <think> chưa đóng tới hết chuỗi (bị cụt vì hết max_tokens giữa lúc suy luận)', async () => {
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: '<think>đang suy luận dở dang chưa xong' } }],
        });
        // Không còn gì dùng được sau khi bóc — coi như response rỗng, fail rõ
        // ràng thay vì trả chuỗi rỗng cho tầng trên tưởng là câu trả lời hợp lệ.
        await expect(run()).rejects.toThrow(LLMGenerationError);
    });
});
