import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateLessonDto } from '@/modules/space-management/dtos/ContentDto';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const lessonId = BigInt(params.id);
        const body = await request.json();
        // Accept both `contentUrl` (DTO name) and `videoUrl` (frontend field name).
        // Only use videoUrl as fallback when it's non-empty to avoid overwriting with blank.
        const dto = new UpdateLessonDto(
            body.title,
            body.contentUrl ?? (body.videoUrl || undefined),
            body.orderIndex,
        );

        const controller = new ManagementController();
        const result = await controller.updateLesson(userId, lessonId, dto);

        return NextResponse.json({
            message: 'Lesson updated successfully',
            sourceId: result.sourceId !== null ? Number(result.sourceId) : null,
        });
    } catch (error) {
        console.error('Update lesson error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const lessonId = BigInt(params.id);

        const controller = new ManagementController();
        await controller.deleteLesson(userId, lessonId);

        return NextResponse.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Delete lesson error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
