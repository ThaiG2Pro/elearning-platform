import axios from 'axios';
import { JSDOM } from 'jsdom';
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
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; elearning-platform-bot/1.0)' },
                timeout: 15_000,
            });
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
