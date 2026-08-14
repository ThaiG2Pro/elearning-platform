import axios from 'axios';

export interface OEmbedResult {
    title: string;
    thumbnailUrl: string;
}

/**
 * WP1.1 — "dán link → tự parse metadata". Uses YouTube's public oEmbed
 * endpoint, which needs no API key (unlike YouTubeAdapter's Data API calls),
 * so the "paste a link" flow works even when YOUTUBE_API_KEY isn't configured.
 */
export class YouTubeOEmbedAdapter {
    private static readonly ID_PATTERN = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    private static readonly HOST_PATTERN = /(?:youtube\.com|youtu\.be)/i;
    private static readonly PLAYLIST_PARAM_PATTERN = /[?&]list=/;

    static isYouTubeHost(url: string): boolean {
        return this.HOST_PATTERN.test(url);
    }

    static isYouTubeUrl(url: string): boolean {
        return this.HOST_PATTERN.test(url) && this.ID_PATTERN.test(url);
    }

    /**
     * WP1.10.2 — true for a *playlist* URL (e.g. `/playlist?list=...`), not
     * for a single video that merely plays as part of a playlist (`?v=...&list=...`
     * still resolves to one video id, so it's left alone). Playlist import is
     * out of scope for the from-link flow — this is what the validate-layer
     * rejection keys off.
     */
    static isPlaylistUrl(url: string): boolean {
        return this.HOST_PATTERN.test(url) && this.PLAYLIST_PARAM_PATTERN.test(url) && !this.ID_PATTERN.test(url);
    }

    static extractVideoId(url: string): string | null {
        const match = url.match(this.ID_PATTERN);
        return match ? match[1] : null;
    }

    /** Canonical form used for `sources.normalized_url` dedup — strips tracking params. */
    static normalize(url: string): string {
        const videoId = this.extractVideoId(url);
        if (!videoId) return url.trim();
        return `https://www.youtube.com/watch?v=${videoId}`;
    }

    async fetchOEmbed(videoUrl: string): Promise<OEmbedResult> {
        try {
            const response = await axios.get('https://www.youtube.com/oembed', {
                params: { url: videoUrl, format: 'json' },
            });
            return {
                title: response.data.title,
                thumbnailUrl: response.data.thumbnail_url,
            };
        } catch (error) {
            throw new Error('YOUTUBE_METADATA_FETCH_FAILED');
        }
    }
}
