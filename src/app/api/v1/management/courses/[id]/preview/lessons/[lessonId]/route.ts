import { NextRequest, NextResponse } from 'next/server';
import { CourseManagementController } from '@/modules/course-management/controllers/CourseManagementController';
import { getUserFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; lessonId: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const lessonId = BigInt(params.lessonId);

        const controller = new CourseManagementController();
        const lessonPreview = await controller.getLessonPreview(courseId, lessonId, user);

        // LessonPreviewDto carries raw bigint ids (Prisma's native type for
        // `id` columns) straight from the domain layer — NextResponse.json's
        // underlying JSON.stringify throws "Do not know how to serialize a
        // BigInt" on those, so every call to this endpoint 500'd. It was
        // never caught earlier because no caller ever actually hit it: this
        // was wired up but unused until the /my-courses/[id]/edit refactor
        // started calling it to show existing quiz questions before re-upload.
        return NextResponse.json({
            ...lessonPreview,
            id: Number(lessonPreview.id),
            quizQuestions: lessonPreview.quizQuestions?.map(q => ({
                ...q,
                id: Number(q.id),
            })),
        });
    } catch (error) {
        console.error('Get lesson preview error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'FORBIDDEN' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
