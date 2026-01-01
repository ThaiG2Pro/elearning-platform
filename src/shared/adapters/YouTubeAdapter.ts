import axios from 'axios';

export interface VideoMetadata {
    duration: number; // in seconds
    thumbnail: string;
}

export class YouTubeAdapter {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('YOUTUBE_API_KEY not configured');
        }
    }

    async fetchMetadata(videoUrl: string): Promise<VideoMetadata> {
        // Extract video ID from URL
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('INVALID_YOUTUBE_URL');
        }

        try {
            const response = await axios.get(`${this.baseUrl}/videos`, {
                params: {
                    part: 'contentDetails,snippet',
                    id: videoId,
                    key: this.apiKey,
                },
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('VIDEO_NOT_FOUND');
            }

            const video = response.data.items[0];
            const duration = this.parseDuration(video.contentDetails.duration);
            const thumbnail = video.snippet.thumbnails.default.url;

            return { duration, thumbnail };
        } catch (error) {
            console.error('YouTube API error:', error);
            throw new Error('YOUTUBE_API_ERROR');
        }
    }

    private extractVideoId(url: string): string | null {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
            /^[^"&?\/\s]{11}$/, // direct video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }
        return null;
    }

    private parseDuration(duration: string): number {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }
}
