import { NextRequest, NextResponse } from 'next/server';
import { LessonController } from '@/modules/course-management/controllers/LessonController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate user
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const lessonId = BigInt(params.id);

        // Get lesson video context
        const controller = new LessonController();
        const result = await controller.getVideoContext(userId, lessonId);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Get video context error:', error);

        if (error.message === 'LESSON_NOT_FOUND') {
            return NextResponse.json(
                { error: 'LESSON_NOT_FOUND', message: 'Lesson not found or not enrolled' },
                { status: 404 }
            );
        }

        if (error.message === 'NOT_ENROLLED') {
            return NextResponse.json(
                { error: 'NOT_ENROLLED', message: 'User is not enrolled in this course' },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: 'SERVER_ERROR', message: 'Internal server error occurred' },
            { status: 500 }
        );
    }
}
