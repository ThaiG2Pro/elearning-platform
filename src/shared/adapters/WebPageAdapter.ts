import axios from 'axios';
import { JSDOM } from 'jsdom';
import { YouTubeOEmbedAdapter } from './YouTubeOEmbedAdapter';

export interface WebPageMetaResult {
    title: string;
}

/**
 * WP3.3 — nguồn web/blog (mục 6.8 economics doc), song song với
 * `YouTubeOEmbedAdapter` cho YouTube: cùng hình dạng static `isXUrl`/
 * `normalize` + instance `fetchMeta`, để `ContentManagementService` phân
 * nhánh theo URL mà không phải sửa logic YouTube hiện có.
 *
 * Cố ý là "bất kỳ URL nào không phải YouTube" — không giữ whitelist domain,
 * vì Vision cho phép dán link blog/web bất kỳ. `AIGenerationService`
 * (`ReadabilityWebContentProvider`) mới là nơi thật sự parse nội dung; adapter
 * này chỉ lo lấy tiêu đề để đặt tên space/lesson lúc tạo, đối xứng với
 * `oEmbedAdapter.fetchOEmbed` bên YouTube.
 */
export class WebPageAdapter {
    static isWebUrl(url: string): boolean {
        if (YouTubeOEmbedAdapter.isYouTubeHost(url)) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /** Dedup theo URL đã bỏ query string/hash — tracking params không đổi nội dung trang. */
    static normalize(url: string): string {
        try {
            const parsed = new URL(url.trim());
            parsed.search = '';
            parsed.hash = '';
            return parsed.toString();
        } catch {
            return url.trim();
        }
    }

    async fetchMeta(url: string): Promise<WebPageMetaResult> {
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; elearning-platform-bot/1.0)' },
                timeout: 15_000,
            });
            const dom = new JSDOM(response.data);
            const title = dom.window.document.title?.trim();
            return { title: title || url };
        } catch (error) {
            throw new Error('WEB_PAGE_METADATA_FETCH_FAILED');
        }
    }
}
