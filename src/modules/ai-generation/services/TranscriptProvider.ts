/**
 * WP2.2 — cô lập thư viện transcript unofficial sau 1 interface
 * (ai-integration-plan.md mục 1): `youtube-transcript-plus` không phải API
 * chính thức của YouTube, có rủi ro breakage khi Google đổi format. Đổi thư
 * viện sau này chỉ cần 1 implementation mới ở đây, không đụng service/policy.
 */
export interface TranscriptProvider {
    /** Trả về toàn bộ transcript dạng text thuần, đã ghép các đoạn caption lại. */
    fetchTranscript(videoId: string): Promise<string>;
}

export class TranscriptFetchError extends Error {
    readonly cause?: unknown;

    constructor(videoId: string, cause?: unknown) {
        super(`TRANSCRIPT_FETCH_FAILED: ${videoId}`);
        this.name = 'TranscriptFetchError';
        this.cause = cause;
    }
}
