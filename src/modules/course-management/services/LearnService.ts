import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { ProgressPolicy } from '../domain/ProgressPolicy';
import { LearningProgress } from '../domain/LearningProgress';
import { ProgressResult } from '../dtos/ProgressResult';
import { PreviewPolicy } from '../domain/PreviewPolicy';
import { PrismaClient } from '@prisma/client';

export class LearnService {
    constructor(
        private progressRepo: LearningProgressRepository,
        // WP1.6 follow-up — the dead `_enrollmentRepo` compatibility param
        // (progress tracking has been ownership-keyed since WP1.3) was
        // dropped, along with the matching call-site arg everywhere this
        // constructor is called.
        private prisma: PrismaClient,
    ) { }

    async trackVideoProgress(
        userId: bigint,
        lessonId: bigint,
        position: number,
        duration: number,
        isPreview: boolean = false
    ): Promise<ProgressResult> {
        // Ownership check — this used to be implicit (only reachable via the
        // owner-gated /courses/[id]/lessons list), but this endpoint takes a
        // bare lessonId straight from the request body: without this check,
        // any authenticated user could POST progress for a lesson belonging
        // to a course they don't own, spoofing a "finished" state and
        // creating orphan learning_progress rows for content they can't see.
        const courseId = await this.findCourseIdByLesson(lessonId);
        await this.assertOwnership(courseId, userId);

        const shouldPersist = PreviewPolicy.shouldPersist(isPreview);

        if (!shouldPersist) {
            // Bypass persistence for preview mode
            return this.calculateMockResult(position, duration);
        }

        // Step 1: Load State
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress) {
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
        // Same ownership gap as trackVideoProgress above — reading someone
        // else's lesson progress wouldn't leak much (it's already keyed by
        // this userId), but a non-owner shouldn't be able to probe whether a
        // given lessonId exists/belongs to a course at all via this route.
        const courseId = await this.findCourseIdByLesson(lessonId);
        await this.assertOwnership(courseId, userId);

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

    /** Personal-organizer model: only the course's owner may read/write progress on its lessons. */
    private async assertOwnership(courseId: bigint, userId: bigint): Promise<void> {
        const course = await this.prisma.courses.findUnique({
            where: { id: courseId },
            select: { owner_id: true },
        });
        if (!course || course.owner_id !== userId) {
            throw new Error('FORBIDDEN');
        }
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
