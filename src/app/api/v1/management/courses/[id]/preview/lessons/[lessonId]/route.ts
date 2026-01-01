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

        return NextResponse.json(lessonPreview);
    } catch (error) {
        console.error('Get lesson preview error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'FORBIDDEN' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
