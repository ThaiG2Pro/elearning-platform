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
            const response = await fetchPublicUrl(url, { timeoutMs: 15_000, maxBytes: 5 * 1024 * 1024 });
            html = response.data;
        } catch (error) {
            throw new WebContentFetchError(url, error);
        }

        try {
            const dom = new JSDOM(html, { url });
            const article = new Readability(dom.window.document).parse();
            if (!article?.textContent?.trim()) {
                throw new Error('EMPTY_ARTICLE');
            }
            return article.textContent.trim();
        } catch (error) {
            throw new WebContentFetchError(url, error);
        }
    }
}
