export interface OwnedSpaceDto {
    id: number;
    title: string;
    slug: string;
    status: 'not_started' | 'in_progress' | 'completed';
    thumbnailUrl?: string;
    completionRate: number;
    // WP1.6.4 — only set when status is 'in_progress' and completionRate is
    // still 0 (typically a space with very few lessons, e.g. a single
    // video): lets the UI show "đã xem 3:20" instead of a flat "0%" that
    // reads as untouched even though the user is mid-video.
    lastWatchedPositionSec?: number;
    // WP1.10.6 — badge "N bài" trên card, phân biệt hình thái (1 video vs
    // nhiều chương/bài) không cần tab/lọc riêng theo nguồn.
    lessonCount: number;
    createdAt: Date;
    // UI (2026-09-05) — /my-learning trộn chung space chủ tự tạo và space
    // clone/fork từ người khác (query chỉ lọc owner_id, giống /my-spaces),
    // set khi space này là 1 bản clone để card hiện "Bản sao của <ownerName>".
    clonedFrom?: { spaceId: number; ownerName: string } | null;
    // UI (2026-09-06) — vòng đời (ACTIVE/ARCHIVED) của space, tách bạch với
    // `status` (tiến độ học) ở trên. Cần để /my-learning (giờ đã gộp với
    // /my-spaces) tự ẩn space đã lưu trữ khỏi danh sách chính, gấp vào 1 mục
    // "Đã lưu trữ" riêng thay vì trộn chung như 1 space đang hoạt động.
    lifecycleStatus: 'ACTIVE' | 'ARCHIVED';
}
