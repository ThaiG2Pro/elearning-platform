export class SpaceDetailDto {
    constructor(
        public id: number,
        public title: string,
        public slug: string,
        public description: string | null,
        public ownerName: string | null,
        public isOwner: boolean,
        public chapters: ChapterDto[],
        public thumbnailUrl?: string,
        public status?: string,
        public completionRate?: number,
        public shareToken?: string,
        // UI (2026-09-05) — set khi space này là bản clone/fork của người
        // khác, để trang preview hiện "Bản sao chép từ Space gốc của
        // <ownerName>" + link "Xem bản gốc".
        public clonedFrom?: { spaceId: number; ownerName: string } | null,
    ) { }
}

export class ChapterDto {
    constructor(
        public id: number,
        public title: string,
        public lessons: LessonDto[],
        public orderIndex?: number,
    ) { }
}

export class LessonDto {
    constructor(
        public id: number,
        public title: string,
        public type: string,
        public orderIndex: number,
        public contentUrl?: string,
        // WP2.3 — Source id để UI trigger AI generation (tóm tắt/quiz).
        // Nullable: lesson tạo thủ công không có Source, không hiện nút AI.
        public sourceId?: number | null,
    ) { }
}

/** Anonymous-visitor view of a shared space — no enrollment/progress fields. */
export class PublicSpaceDto {
    constructor(
        public id: number,
        public title: string,
        public description: string | null,
        public ownerName: string | null,
        public chapters: ChapterDto[],
        public thumbnailUrl?: string,
        public shareToken?: string,
        public ownerId?: number,
        // UI (2026-09-05) — xem SpaceDetailDto ở trên.
        public clonedFrom?: { spaceId: number; ownerName: string } | null,
    ) { }
}
