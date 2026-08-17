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
 * WP2.3 — trigger tạo tóm tắt/quiz bằng AI cho 1 Source. Luôn optional: lỗi
 * ở đây không được phép chặn việc học, chỉ hiện thông báo trong panel gọi
 * hàm này (xem AIGenerationPanel).
 */
export const generateAIContent = async (
    sourceId: number,
    type: AIRecipeType,
): Promise<AIGenerationResult> => {
    try {
        const response = await api.post(`/sources/${sourceId}/ai-generations`, { type });
        return response.data as AIGenerationResult;
    } catch (error: any) {
        const code = error.response?.data?.error;
        // WP2.3 (ticket 06) — nhánh UX quota-cạn: hiện rõ "thêm key miễn phí
        // của bạn hoặc chờ ngày mai", không âm thầm chặn, không tự fallback.
        if (code === 'AI_DAILY_RATE_LIMIT_EXCEEDED') {
            throw new Error('Đã dùng hết lượt tạo AI miễn phí hôm nay — thử lại vào ngày mai.');
        }
        if (code === 'SHARED_FREE_NOT_CONFIGURED') {
            throw new Error('Tính năng AI chưa được bật trên nền tảng này.');
        }
        if (code === 'SOURCE_TOO_LONG_FOR_SHARED_FREE') {
            throw new Error('Video này quá dài để tạo miễn phí.');
        }
        if (code === 'TRANSCRIPT_UNSUPPORTED_SOURCE') {
            throw new Error('Không lấy được nội dung video này để tạo AI.');
        }
        if (code === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID') {
            throw new Error('Cần thêm API key riêng để tuỳ biến bản này.');
        }
        throw new Error('Có lỗi xảy ra khi tạo nội dung bằng AI.');
    }
};
