export class CourseDetailDto {
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
    ) { }
}

/** Anonymous-visitor view of a shared course — no enrollment/progress fields. */
export class PublicCourseDto {
    constructor(
        public id: number,
        public title: string,
        public description: string | null,
        public ownerName: string | null,
        public chapters: ChapterDto[],
        public thumbnailUrl?: string,
        public shareToken?: string,
        public ownerId?: number,
    ) { }
}
