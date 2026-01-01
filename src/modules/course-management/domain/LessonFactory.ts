import { Lesson, LessonType } from './Lesson';

export interface VideoLessonData {
    chapterId: bigint;
    title: string;
    videoUrl: string;
    orderIndex: number;
}

export interface VideoMetadata {
    duration: number;
    thumbnail: string;
}

export class LessonFactory {
    static createVideoLesson(data: VideoLessonData, metadata: VideoMetadata): Lesson {
        return Lesson.createVideoLesson(
            data.chapterId,
            data.title,
            data.videoUrl,
            data.orderIndex,
            metadata
        );
    }

    static createQuizLesson(
        chapterId: bigint,
        title: string,
        quizData: any, // Will be defined later
        orderIndex: number
    ): Lesson {
        return new Lesson(
            null,
            chapterId,
            title,
            LessonType.QUIZ,
            JSON.stringify(quizData),
            orderIndex
        );
    }
}
