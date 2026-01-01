import { NextRequest, NextResponse } from 'next/server';
import { CourseController } from '@/modules/course-management/controllers/CourseController';
import { prisma } from '@/shared/config/database';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const courseId = BigInt(params.id);
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const controller = new CourseController();
        const course = await controller.getCourseDetail(courseId, userId);

        if (!course) {
            return NextResponse.json(
                { error: 'COURSE_NOT_FOUND' },
                { status: 404 }
            );
        }

        if (!course.isEnrolled) {
            return NextResponse.json(
                { error: 'NOT_ENROLLED' },
                { status: 403 }
            );
        }

        // Extract lessons from chapters
        const progressRepo = new (await import('@/modules/course-management/repositories/LearningProgressRepository')).LearningProgressRepository(prisma);

        const lessons = [] as any[];
        for (const chapter of course.chapters) {
            for (const lesson of chapter.lessons) {
                // Get progress for this lesson for the user
                const progress = await progressRepo.findByStudentAndLesson(userId, BigInt(lesson.id));
                const isCompleted = !!progress?.isFinished;

                // Duration: try lesson.duration if present, otherwise 0 (could be enhanced to fetch YouTube metadata)
                const duration = (lesson as any).duration || 0;

                lessons.push({
                    id: lesson.id.toString(),
                    title: lesson.title,
                    type: lesson.type,
                    order: lesson.orderIndex,
                    videoUrl: lesson.contentUrl,
                    isCompleted,
                    duration
                });
            }
        }

        return NextResponse.json(lessons);
    } catch (error) {
        console.error('Get course lessons error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
