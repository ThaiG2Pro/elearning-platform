import { JSDOM } from 'jsdom';
import { fetchPublicUrl } from '../../../shared/security/safeUrl';
import { Readability } from '@mozilla/readability';
import { WebContentFetchError, WebContentProvider } from './WebContentProvider';

/**
 * WP3.3 — implementation duy nhất của `WebContentProvider` cho Checkpoint 3
 * (ai-integration-plan.md mục 1): `@mozilla/readability` + `jsdom`, miễn phí,
 * không cần dịch vụ ngoài trả phí (khớp nguyên tắc BYOK-first).
 */
export class ReadabilityWebContentProvider implements WebContentProvider {
    async fetchContent(url: string): Promise<string> {
        let html: string;
        try {
            // SSRF guard: public host only, redirects re-validated, body capped.
            // Perf (2026-09-06): 5MB → 2MB. HTML bài viết hiếm khi > 1MB; JSDOM
            // nhân kích thước HTML lên ~10x trong RAM, 5MB là ~50MB heap cho 1
            // request trên VPS 512MB.
            const response = await fetchPublicUrl(url, { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024 });
            html = response.data;
        } catch (error) {
            throw new WebContentFetchError(url, error);
        }

        try {
            const dom = new JSDOM(html, { url });
            const article = new Readability(dom.window.document).parse();
            dom.window.close();
            if (!article?.textContent?.trim()) {
                throw new Error('EMPTY_ARTICLE');
            }
            return article.textContent.trim();
        } catch (error) {
            throw new WebContentFetchError(url, error);
        }
    }
}
