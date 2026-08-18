/**
 * WP3.3 — cô lập việc fetch/parse trang web/blog sau 1 interface, cùng lý do
 * với `TranscriptProvider` cho YouTube (ai-integration-plan.md mục 1): thư
 * viện extraction (readability) có thể đổi, không đụng service/policy.
 *
 * Khác YouTube ở 1 điểm quan trọng (mục 6.8 economics doc): nội dung trang
 * gốc có thể đổi/bị gỡ sau khi đã cache — `sources.transcript_fetched_at`
 * (đã có sẵn từ WP2.2) là tín hiệu "có thể đã cũ", không coi là chân lý
 * vĩnh viễn như transcript video.
 */
export interface WebContentProvider {
    /** Trả về nội dung chính của trang (đã lọc menu/quảng cáo/footer) dạng text thuần. */
    fetchContent(url: string): Promise<string>;
}

export class WebContentFetchError extends Error {
    readonly cause?: unknown;

    constructor(url: string, cause?: unknown) {
        super(`WEB_CONTENT_FETCH_FAILED: ${url}`);
        this.name = 'WebContentFetchError';
        this.cause = cause;
    }
}
