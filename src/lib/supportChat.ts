import axios from 'axios';
import api from './api';
import type { AgentContext } from '@/components/ai/SalesAgentWidget';

/**
 * Client cho widget CSKH → POST /api/v1/support/chat (proxy sang AI agent).
 * Widget phân biệt 3 tình huống bằng lỗi có kiểu: agent chưa cấu hình/đang
 * sập (→ rơi về menu FAQ tĩnh cho hết phiên), bị rate-limit (→ nhắc chờ),
 * còn lại là lỗi thường.
 */
export interface SupportChatReply {
    answer: string;
    /** Agent không tìm thấy căn cứ trong tài liệu → widget ưu tiên nút "người thật". */
    declined: boolean;
    intent: string;
    sessionId: string;
    /** Tiêu đề FAQ agent đã dựa vào (tối đa 3) — hiện "Nguồn: …" dưới câu trả lời. */
    citations: string[];
    elapsedMs: number;
}

export class SupportAgentUnavailableError extends Error {
    constructor(public readonly status?: number) {
        super('SUPPORT_AGENT_UNAVAILABLE');
    }
}

export class SupportRateLimitedError extends Error {
    constructor() {
        super('SUPPORT_RATE_LIMITED');
    }
}

export interface SendSupportMessageInput {
    message: string;
    sessionId: string;
    context: AgentContext;
}

export async function sendSupportMessage(input: SendSupportMessageInput): Promise<SupportChatReply> {
    try {
        // Agent chạy LangGraph nhiều bước (router → RAG → answer) — 1 lượt
        // có thể 10–30s với model cloud, hơn với model local.
        const response = await api.post('/support/chat', input, { timeout: 60_000 });
        return response.data as SupportChatReply;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 429) throw new SupportRateLimitedError();
            if (!status || status === 502 || status === 503 || status === 504) {
                throw new SupportAgentUnavailableError(status);
            }
        }
        throw error;
    }
}
