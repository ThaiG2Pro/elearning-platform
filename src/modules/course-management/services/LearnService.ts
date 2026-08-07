import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { ProgressPolicy } from '../domain/ProgressPolicy';
import { LearningProgress } from '../domain/LearningProgress';
import { ProgressResult } from '../dtos/ProgressResult';
import { PreviewPolicy } from '../domain/PreviewPolicy';
import { PrismaClient } from '@prisma/client';

export class LearnService {
    constructor(
        private progressRepo: LearningProgressRepository,
        // Accepted only for constructor-shape compatibility with existing call
        // sites; progress tracking itself no longer depends on an enrollment
        // existing (WP1.3 — progress is keyed by ownership, not enrollment).
        _enrollmentRepo: EnrollmentRepository | undefined,
        private prisma: PrismaClient,
    ) { }

    async trackVideoProgress(
        userId: bigint,
        lessonId: bigint,
        position: number,
        duration: number,
        isPreview: boolean = false
    ): Promise<ProgressResult> {
        const shouldPersist = PreviewPolicy.shouldPersist(isPreview);

        if (!shouldPersist) {
            // Bypass persistence for preview mode
            return this.calculateMockResult(position, duration);
        }

        // Step 1: Load State
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress) {
            const courseId = await this.findCourseIdByLesson(lessonId);
            progress = LearningProgress.create(userId, courseId, lessonId);
        }

        // Step 2: Update Position
        progress.updatePosition(position);

        // Step 3: Check Completion Policy
        const isValidToFinish = ProgressPolicy.checkCompletionCondition(position, duration);

        // Step 4: Try Finish
        progress.tryFinish(isValidToFinish);

        // Step 5: Persist
        await this.progressRepo.save(progress);

        return { isFinished: progress.isFinished };
    }

    async getProgress(userId: bigint, lessonId: bigint): Promise<{ currentPosition: number; isCompleted: boolean; lastAccessedAt: string } | null> {
        const progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress) {
            return null;
        }

        return {
            currentPosition: progress.videoLastPosition || 0,
            isCompleted: progress.isFinished,
            lastAccessedAt: new Date().toISOString() // Could be enhanced to track actual access time
        };
    }

    /** WP1.3 — % of a course's lessons the given user has finished, for course-detail display. */
    async getCourseProgress(userId: bigint, courseId: bigint): Promise<{ completionRate: number; finishedLessons: number; totalLessons: number }> {
        const lessons = await this.prisma.lessons.findMany({
            where: { chapter: { course_id: courseId } },
            select: { id: true },
        });
        const totalLessons = lessons.length;

        const progresses = await this.progressRepo.findByUserAndCourse(userId, courseId);
        const lessonIds = new Set(lessons.map(l => l.id));
        const finishedLessons = progresses.filter(p => p.isFinished && lessonIds.has(p.lessonId)).length;

        return {
            completionRate: totalLessons > 0 ? Math.round((finishedLessons / totalLessons) * 100) : 0,
            finishedLessons,
            totalLessons,
        };
    }

    private async findCourseIdByLesson(lessonId: bigint): Promise<bigint> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } },
        });
        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }
        return lesson.chapter.course.id;
    }

    private calculateMockResult(position: number, duration: number): ProgressResult {
        // WP1.5.3: this used a hardcoded 90% threshold while the real
        // (persisted) completion path used ProgressPolicy's 80% — two
        // different definitions of "done" depending on preview vs real
        // tracking. Preview mode should mirror the same rule.
        const isFinished = ProgressPolicy.checkCompletionCondition(position, duration);

        return { isFinished };
    }
}
