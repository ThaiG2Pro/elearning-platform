export interface OwnedCourseDto {
    id: number;
    title: string;
    slug: string;
    status: 'not_started' | 'in_progress' | 'completed';
    thumbnailUrl?: string;
    completionRate: number;
    // WP1.6.4 — only set when status is 'in_progress' and completionRate is
    // still 0 (typically a course with very few lessons, e.g. a single
    // video): lets the UI show "đã xem 3:20" instead of a flat "0%" that
    // reads as untouched even though the user is mid-video.
    lastWatchedPositionSec?: number;
    // WP1.10.6 — badge "N bài" trên card, phân biệt hình thái (1 video vs
    // nhiều chương/bài) không cần tab/lọc riêng theo nguồn.
    lessonCount: number;
    createdAt: Date;
}
