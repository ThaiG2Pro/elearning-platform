import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateLessonDto } from '@/modules/course-management/dtos/ContentDto';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sectionId = BigInt(params.id);
        const body: CreateLessonDto = await request.json();

        const controller = new ManagementController();
        const lessonId = await controller.createLesson(userId, sectionId, body);

        return NextResponse.json({ lessonId: Number(lessonId) }, { status: 201 });
    } catch (error) {
        console.error('Create lesson error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'SECTION_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
