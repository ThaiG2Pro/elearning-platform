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
    ) { }
}
