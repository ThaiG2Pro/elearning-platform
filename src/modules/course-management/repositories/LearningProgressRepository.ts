import { PrismaClient } from '@prisma/client';
import { LearningProgress } from '../domain/LearningProgress';

export class LearningProgressRepository {
    constructor(private prisma: PrismaClient) { }

    async findByStudentAndLesson(studentId: bigint, lessonId: bigint): Promise<LearningProgress | null> {
        const progress = await this.prisma.learning_progress.findFirst({
            where: {
                enrollment: {
                    student_id: studentId,
                },
                lesson_id: lessonId,
            },
        });

        if (!progress) return null;

        return new LearningProgress(
            progress.id,
            progress.enrollment_id,
            progress.lesson_id,
            progress.is_finished,
            progress.video_last_position,
            progress.quiz_max_score,
            progress.quiz_start_time,
            progress.personal_note,
            progress.quiz_question_ids ? (() => { try { return JSON.parse(progress.quiz_question_ids).map((id: string) => BigInt(id)); } catch { console.error('Failed to parse quiz_question_ids:', progress.quiz_question_ids); return []; } })() : []
        );
    }

    async save(progress: LearningProgress): Promise<LearningProgress> {
        const data = {
            enrollment_id: progress.enrollmentId,
            lesson_id: progress.lessonId,
            is_finished: progress.isFinished,
            video_last_position: progress.videoLastPosition,
            quiz_max_score: progress.quizMaxScore,
            quiz_start_time: progress.quizStartTime,
            personal_note: progress.personalNote,
            quiz_question_ids: progress.quizQuestionIds ? JSON.stringify(progress.quizQuestionIds.map(id => id.toString())) : null,
        };

        if (progress.id) {
            const updated = await this.prisma.learning_progress.update({
                where: { id: progress.id },
                data,
            });
            return new LearningProgress(
                updated.id,
                updated.enrollment_id,
                updated.lesson_id,
                updated.is_finished,
                updated.video_last_position,
                updated.quiz_max_score,
                updated.quiz_start_time,
                updated.personal_note,
                updated.quiz_question_ids ? (() => { try { return JSON.parse(updated.quiz_question_ids).map((id: string) => BigInt(id)); } catch { console.error('Failed to parse quiz_question_ids:', updated.quiz_question_ids); return []; } })() : []
            );
        } else {
            const created = await this.prisma.learning_progress.create({
                data,
            });
            return new LearningProgress(
                created.id,
                created.enrollment_id,
                created.lesson_id,
                created.is_finished,
                created.video_last_position,
                created.quiz_max_score,
                created.quiz_start_time,
                created.personal_note,
                created.quiz_question_ids ? (() => { try { return JSON.parse(created.quiz_question_ids).map((id: string) => BigInt(id)); } catch { console.error('Failed to parse quiz_question_ids:', created.quiz_question_ids); return []; } })() : []
            );
        }
    }

    async findByEnrollment(enrollmentId: bigint): Promise<LearningProgress[]> {
        const progresses = await this.prisma.learning_progress.findMany({
            where: { enrollment_id: enrollmentId },
        });

        return progresses.map(progress => new LearningProgress(
            progress.id,
            progress.enrollment_id,
            progress.lesson_id,
            progress.is_finished,
            progress.video_last_position,
            progress.quiz_max_score,
            progress.quiz_start_time,
            progress.personal_note,
            progress.quiz_question_ids ? (() => { try { return JSON.parse(progress.quiz_question_ids).map((id: string) => BigInt(id)); } catch { console.error('Failed to parse quiz_question_ids:', progress.quiz_question_ids); return []; } })() : []
        ));
    }
}
