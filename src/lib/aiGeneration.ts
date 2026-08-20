import api from './api';

export type AIRecipeType = 'summary' | 'quiz';

export interface AIGenerationResult {
    id: string;
    status: 'PENDING' | 'READY' | 'FAILED';
    keySource: 'SHARED_FREE' | 'BYOK' | 'PAID_TIER';
    content: string | null;
    servedFromCache: boolean;
}

/**
 * WP3.1 — tuỳ biến recipe + BYOK. Không truyền gì ngoài `type` = hành vi
 * Checkpoint 2 cũ (recipe mặc định, SHARED_FREE). `byokApiKey`/`byokBaseUrl`/
 * `byokModel` bắt buộc đủ cả 3 khi dùng BYOK — không đoán giúp provider/model
 * (server enforce lại, đây chỉ là type cho tầng gọi).
 */
export interface AIGenerationOptions {
    params?: Record<string, unknown>;
    segmentRange?: { startSec: number; endSec: number };
    byokApiKey?: string;
    byokBaseUrl?: string;
    byokModel?: string;
    requestedVisibility?: 'PRIVATE' | 'SHARED';
    /** WP4.1 — "Trả phí để nền tảng tạo giúp" (nửa thứ 2 của nhánh UX #4). */
    paymentMethod?: 'CREDITS';
}

/**
 * WP4.1 — giữ lại `code` gốc từ backend (khác message tiếng Việt hiển thị),
 * để UI phân biệt được `AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID` (hiện nút
 * "trả phí") với `AI_INSUFFICIENT_CREDITS` (dẫn sang /billing) mà không phải
 * so sánh chuỗi tiếng Việt dễ vỡ khi đổi câu chữ.
 */
export class AIGenerationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'AIGenerationError';
    }
}

/**
 * WP2.3 — trigger tạo tóm tắt/quiz bằng AI cho 1 Source. Luôn optional: lỗi
 * ở đây không được phép chặn việc học, chỉ hiện thông báo trong panel gọi
 * hàm này (xem AIGenerationPanel).
 */
export const generateAIContent = async (
    sourceId: number,
    type: AIRecipeType,
    options?: AIGenerationOptions,
): Promise<AIGenerationResult> => {
    try {
        const response = await api.post(`/sources/${sourceId}/ai-generations`, { type, ...options });
        return response.data as AIGenerationResult;
    } catch (error: any) {
        const code = error.response?.data?.error;
        // WP2.3 (ticket 06) — nhánh UX quota-cạn: hiện rõ "thêm key miễn phí
        // của bạn hoặc chờ ngày mai", không âm thầm chặn, không tự fallback.
        if (code === 'AI_DAILY_RATE_LIMIT_EXCEEDED') {
            throw new AIGenerationError('Đã dùng hết lượt tạo AI miễn phí hôm nay — thử lại vào ngày mai.', code);
        }
        if (code === 'SHARED_FREE_NOT_CONFIGURED') {
            throw new AIGenerationError('Tính năng AI chưa được bật trên nền tảng này.', code);
        }
        if (code === 'SOURCE_TOO_LONG_FOR_SHARED_FREE') {
            throw new AIGenerationError('Video này quá dài để tạo miễn phí.', code);
        }
        if (code === 'TRANSCRIPT_UNSUPPORTED_SOURCE') {
            throw new AIGenerationError('Không lấy được nội dung nguồn này để tạo AI.', code);
        }
        if (code === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID') {
            throw new AIGenerationError('Cần thêm API key riêng — hoặc trả phí để nền tảng tạo giúp.', code);
        }
        // WP3.1 — lỗi BYOK luôn hiện rõ, không tự fallback (mục 6.2).
        if (code === 'BYOK_CONFIG_INCOMPLETE') {
            throw new AIGenerationError('Cần nhập đủ cả API key, endpoint và tên model để dùng key riêng.', code);
        }
        // WP4.1 — không đủ credit: dẫn rõ sang trang mua thêm, không âm thầm chặn.
        if (code === 'AI_INSUFFICIENT_CREDITS') {
            throw new AIGenerationError('Không đủ credit — mua thêm để dùng tính năng trả phí này.', code);
        }
        if (code === 'BILLING_NOT_CONFIGURED') {
            throw new AIGenerationError('Tính năng trả phí chưa được bật trên nền tảng này.', code);
        }
        throw new AIGenerationError('Có lỗi xảy ra khi tạo nội dung bằng AI.', code ?? 'UNKNOWN');
    }
};

/**
 * Bổ sung: cho phép biến kết quả `generateAIContent(sourceId, 'quiz')` thành
 * 1 bài quiz thật trong editor (`saveGeneratedQuizQuestions` ở
 * `src/lib/management.ts`), thay vì chỉ hiển thị văn bản thô như
 * `AIGenerationPanel` đang làm. Shape khớp đúng `ParsedQuestionDto` phía
 * backend (xem `QuizService`/`QuizValidationPolicy.validateParsedQuestion`).
 */
export interface AIQuizQuestionDraft {
    content: string;
    options: string[];
    correctAnswer: string;
}

/**
 * `content` trả về từ backend là text thuần (cột `Text` của `ai_generations`,
 * không có validate/parse nào ở tầng AIGenerationService — xem prompt ở
 * `buildPrompt`, chỉ *yêu cầu* model trả JSON, không đảm bảo). Hàm này chịu
 * trách nhiệm khoan dung: bóc code-fence markdown, thử parse thẳng, rồi thử
 * cắt đúng đoạn `[...]` nếu model chèn thêm lời dẫn trước/sau. Chuẩn hoá vài
 * tên field thường gặp (`question`/`text` thay `content`, `answer` thay
 * `correctAnswer`, index số thay vì text) — nhưng KHÔNG tự nới lỏng luật hợp
 * lệ (2-4 options, correctAnswer khớp 1 option) - server
 * (`QuizValidationPolicy.validateParsedQuestion`) vẫn là trọng tài cuối cùng
 * khi lưu thật.
 */
export function parseAIQuizContent(raw: string): AIQuizQuestionDraft[] {
    const stripped = raw.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    let data: unknown;
    try {
        data = JSON.parse(stripped);
    } catch {
        const start = stripped.indexOf('[');
        const end = stripped.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) {
            throw new AIGenerationError('Không đọc được quiz do AI trả về — thử tạo lại.', 'AI_QUIZ_UNPARSEABLE');
        }
        try {
            data = JSON.parse(stripped.slice(start, end + 1));
        } catch {
            throw new AIGenerationError('Không đọc được quiz do AI trả về — thử tạo lại.', 'AI_QUIZ_UNPARSEABLE');
        }
    }

    if (!Array.isArray(data)) {
        throw new AIGenerationError('Không đọc được quiz do AI trả về — thử tạo lại.', 'AI_QUIZ_UNPARSEABLE');
    }

    const drafts: AIQuizQuestionDraft[] = [];
    for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const obj = item as Record<string, unknown>;

        const content = String(obj.content ?? obj.question ?? obj.text ?? '').trim();

        const rawOptions = obj.options ?? obj.choices ?? obj.answers;
        const options = Array.isArray(rawOptions)
            ? rawOptions.map((opt) => String(opt).trim()).filter((opt) => opt.length > 0)
            : [];

        let correctAnswerRaw = obj.correctAnswer ?? obj.answer ?? obj.correct;
        if (typeof correctAnswerRaw === 'number') {
            correctAnswerRaw = options[correctAnswerRaw] ?? String(correctAnswerRaw);
        }
        const correctAnswer = correctAnswerRaw != null ? String(correctAnswerRaw).trim() : '';

        if (!content || options.length < 2 || options.length > 4 || !correctAnswer) continue;
        drafts.push({ content, options, correctAnswer });
    }

    if (drafts.length === 0) {
        throw new AIGenerationError('Không đọc được quiz do AI trả về — thử tạo lại.', 'AI_QUIZ_UNPARSEABLE');
    }
    return drafts;
}
