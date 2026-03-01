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

    static createVideoLesson(
        chapterId: bigint,
        title: string,
        videoUrl: string,
        orderIndex: number,
        _metadata: { duration: number; thumbnail: string }
    ): Lesson {
        return new Lesson(
            null,
            chapterId,
            title,
            LessonType.VIDEO,
            videoUrl,
            orderIndex
        );
    }

    getVideoMetadata(): { url: string; duration: number; thumbnail: string } | null {
        if (this.type !== LessonType.VIDEO) return null;
        try {
            const parsed = JSON.parse(this.contentUrl);
            if (parsed && parsed.url) return parsed;
        } catch { /* raw URL */ }
        return { url: this.contentUrl, duration: 0, thumbnail: '' };
    }
}
