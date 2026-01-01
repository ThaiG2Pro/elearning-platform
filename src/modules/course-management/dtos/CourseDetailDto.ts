export class CourseDetailDto {
    constructor(
        public id: number,
        public title: string,
        public slug: string,
        public description: string | null,
        public lecturerName: string | null,
        public isEnrolled: boolean,
        public chapters: ChapterDto[],
        public thumbnailUrl?: string,
    ) { }
}

export class ChapterDto {
    constructor(
        public id: number,
        public title: string,
        public lessons: LessonDto[],
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
