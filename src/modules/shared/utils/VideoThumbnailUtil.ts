export class VideoThumbnailUtil {
    /**
     * Find the first video URL from course chapters and lessons in order
     */
    static findFirstVideoUrl(chapters: any[]): string | null {
        // Iterate through chapters in order
        for (const chapter of chapters) {
            // Iterate through lessons in order
            for (const lesson of chapter.lessons) {
                // Check both content_url (from database) and contentUrl (from entities)
                const videoUrl = lesson.content_url || lesson.contentUrl;
                if (videoUrl) {
                    return videoUrl;
                }
            }
        }
        return null;
    }

    /**
     * Derive thumbnail URL from video URL (YouTube, Vimeo, or fallback)
     */
    static deriveThumbnailFromVideoUrl(videoUrl: string): string {
        try {
            // YouTube URL patterns
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = videoUrl.match(youtubeRegex);
            if (match) {
                const videoId = match[1];
                return `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }

            // Vimeo URL patterns
            const vimeoRegex = /(?:vimeo\.com\/)(?:.*#|.*\/videos\/|.*\/|channels\/.*\/|groups\/.*\/videos\/|album\/.*\/video\/|video\/)?([0-9]+)(?:$|\/|\?)/;
            const vimeoMatch = videoUrl.match(vimeoRegex);
            if (vimeoMatch) {
                const videoId = vimeoMatch[1];
                return `https://vumbnail.com/${videoId}.jpg`;
            }

            // For other video URLs or local videos, return a default placeholder
            return '/images/video-placeholder.svg';
        } catch (error) {
            console.warn('Error deriving thumbnail from video URL:', error);
            return '/images/video-placeholder.svg';
        }
    }
}
