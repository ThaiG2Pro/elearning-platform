import { fetchTranscript } from 'youtube-transcript-plus';
import { TranscriptFetchError, TranscriptProvider } from './TranscriptProvider';
import { withTimeout } from '@/shared/http/withTimeout';

// Perf (2026-09-06): lib không cho set timeout; YouTube chậm/chặn IP VPS là
// request user treo vô hạn.
const TRANSCRIPT_TIMEOUT_MS = 20_000;

/**
 * WP2.2 — implementation đầu tiên của `TranscriptProvider`, dùng
 * `youtube-transcript-plus` (lấy được cả auto-generated caption, khác YouTube
 * Data API chính thức chỉ tải được caption do chính chủ kênh upload — phần
 * lớn video giáo dục free không có caption chính chủ, xem
 * `docs/design/ai-integration-plan.md` mục 1).
 */
export class YoutubeTranscriptPlusProvider implements TranscriptProvider {
    async fetchTranscript(videoId: string): Promise<string> {
        try {
            const segments = await withTimeout(fetchTranscript(videoId), TRANSCRIPT_TIMEOUT_MS, 'TRANSCRIPT_FETCH');
            return segments.map((segment) => segment.text).join(' ').trim();
        } catch (error) {
            throw new TranscriptFetchError(videoId, error);
        }
    }
}
