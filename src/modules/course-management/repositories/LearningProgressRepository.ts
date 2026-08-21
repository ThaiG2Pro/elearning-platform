import { PrismaClient } from '@prisma/client';
import { LearningProgress } from '../domain/LearningProgress';

/**
 * WP1.3: progress rows are keyed by (user_id, lesson_id) — ownership, not
 * enrollment. The legacy `enrollment_id` FK (WP1.6 follow-up cleanup) has
 * been dropped from the schema entirely.
 */
export class LearningProgressRepository {
    constructor(private prisma: PrismaClient) { }

    private toDomain(progress: {
        id: bigint; user_id: bigint; course_id: bigint;
        lesson_id: bigint; is_finished: boolean; video_last_position: number | null;
        quiz_max_score: number | null; quiz_start_time: Date | null;
        quiz_question_ids: string | null;
    }): LearningProgress {
        return new LearningProgress(
            progress.id,
            progress.user_id,
            progress.course_id,
            progress.lesson_id,
            progress.is_finished,
            progress.video_last_position,
            progress.quiz_max_score,
            progress.quiz_start_time,
            progress.quiz_question_ids ? (() => { try { return JSON.parse(progress.quiz_question_ids!).map((id: string) => BigInt(id)); } catch { console.error('Failed to parse quiz_question_ids:', progress.quiz_question_ids); return []; } })() : [],
        );
    }

    async findByStudentAndLesson(userId: bigint, lessonId: bigint): Promise<LearningProgress | null> {
        const progress = await this.prisma.learning_progress.findFirst({
            where: { user_id: userId, lesson_id: lessonId },
        });
        if (!progress) return null;
        return this.toDomain(progress);
    }

    async save(progress: LearningProgress): Promise<LearningProgress> {
        const data = {
            user_id: progress.userId,
            course_id: progress.courseId,
            lesson_id: progress.lessonId,
            is_finished: progress.isFinished,
            video_last_position: progress.videoLastPosition,
            quiz_max_score: progress.quizMaxScore,
            quiz_start_time: progress.quizStartTime,
            quiz_question_ids: progress.quizQuestionIds ? JSON.stringify(progress.quizQuestionIds.map(id => id.toString())) : null,
        };

        if (progress.id) {
            const updated = await this.prisma.learning_progress.update({
                where: { id: progress.id },
                data,
            });
            return this.toDomain(updated);
        } else {
            const created = await this.prisma.learning_progress.upsert({
                where: { user_id_lesson_id: { user_id: progress.userId, lesson_id: progress.lessonId } },
                update: data,
                create: data,
            });
            return this.toDomain(created);
        }
    }

    /** All progress rows for a user across a course's lessons — used to compute completion %. */
    async findByUserAndCourse(userId: bigint, courseId: bigint): Promise<LearningProgress[]> {
        const progresses = await this.prisma.learning_progress.findMany({
            where: { user_id: userId, course_id: courseId },
        });
        return progresses.map(p => this.toDomain(p));
    }
}
