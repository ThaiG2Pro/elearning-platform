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
        metadata: { duration: number; thumbnail: string }
    ): Lesson {
        const contentData = JSON.stringify({
            url: videoUrl,
            duration: metadata.duration,
            thumbnail: metadata.thumbnail,
        });

        return new Lesson(
            null,
            chapterId,
            title,
            LessonType.VIDEO,
            contentData,
            orderIndex
        );
    }

    getVideoMetadata(): { url: string; duration: number; thumbnail: string } | null {
        if (this.type !== LessonType.VIDEO) return null;
        try {
            return JSON.parse(this.contentUrl);
        } catch {
            return null;
        }
    }
}
