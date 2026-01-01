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
        private enrollmentRepo: EnrollmentRepository,
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
            // Find enrollment for this lesson
            const enrollment = await this.findEnrollmentByLesson(userId, lessonId);
            if (!enrollment) {
                throw new Error('ENROLLMENT_NOT_FOUND');
            }
            progress = LearningProgress.create(enrollment.id!, lessonId);
        }

        // Step 2: Update Position
        progress.updatePosition(position);

        // Step 3: Check Completion Policy
        const isValidToFinish = ProgressPolicy.checkCompletionCondition(position, duration);

        // Step 4: Try Finish
        const statusChanged = progress.tryFinish(isValidToFinish);

        // Step 5: Persist
        await this.progressRepo.save(progress);

        // Step 6: Side Effect
        if (statusChanged) {
            await this.recalculateCourseProgress(userId, progress.enrollmentId);
        }

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

    private async findEnrollmentByLesson(userId: bigint, lessonId: bigint): Promise<any> {
        // Find course that contains this lesson
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            include: {
                chapter: {
                    include: {
                        course: true
                    }
                }
            }
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        const courseId = lesson.chapter.course.id;

        // Find enrollment
        return await this.enrollmentRepo.findByStudentAndCourse(userId, courseId);
    }

    private async recalculateCourseProgress(_userId: bigint, enrollmentId: bigint): Promise<void> {
        // Get enrollment to find courseId
        const enrollment = await this.enrollmentRepo.findById(enrollmentId);
        if (!enrollment) return;

        // Get all lessons in the course
        const lessons = await this.prisma.lessons.findMany({
            where: {
                chapter: {
                    course_id: enrollment.courseId
                }
            }
        });
        const totalLessons = lessons.length;

        // Get all progresses for this enrollment
        const progresses = await this.progressRepo.findByEnrollment(enrollmentId);

        // Count finished lessons
        const finishedCount = progresses.filter(p => p.isFinished).length;

        // Calculate completion rate
        const completionRate = totalLessons > 0 ? Math.round((finishedCount / totalLessons) * 100) : 0;

        // Update enrollment
        enrollment.completionRate = completionRate;
        await this.enrollmentRepo.save(enrollment);
    }

    private calculateMockResult(position: number, duration: number): ProgressResult {
        // Mock calculation for preview - consider finished if watched > 90%
        const progressPercentage = (position / duration) * 100;
        const isFinished = progressPercentage > 90;

        return { isFinished };
    }
}
