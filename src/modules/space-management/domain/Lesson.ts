export enum LessonType {
    VIDEO = 'VIDEO',
    QUIZ = 'QUIZ',
}

export class Lesson {
    constructor(
        public id: bigint | null,
        public chapterId: bigint,
        public title: string,
        public type: LessonType,
        public contentUrl: string,
        public orderIndex: number,
        // WP2.3 — nullable: chỉ lesson tạo từ from-link (video lẻ) mới có
        // Source để trigger AI; lesson thêm thủ công không có gì để tóm tắt.
        public sourceId?: bigint | null,
    ) { }
}
