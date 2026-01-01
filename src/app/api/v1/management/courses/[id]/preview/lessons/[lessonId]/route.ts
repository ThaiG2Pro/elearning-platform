import { NextRequest, NextResponse } from 'next/server';
import { CourseManagementController } from '@/modules/course-management/controllers/CourseManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; lessonId: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const lessonId = BigInt(params.lessonId);

        const controller = new CourseManagementController();
        const lessonPreview = await controller.getLessonPreview(courseId, lessonId);

        return NextResponse.json(lessonPreview);
    } catch (error) {
        console.error('Get lesson preview error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
