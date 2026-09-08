import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateLessonDto } from '@/modules/space-management/dtos/ContentDto';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

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
        const status = message === 'ACCESS_DENIED' ? 403
            : message === 'LESSON_NOT_FOUND' ? 404
            : message === 'TITLE_TOO_LONG' || message === 'URL_TOO_LONG' || message === 'INVALID_CONTENT_URL' ? 400
            : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const controller = new ManagementController();
        await controller.deleteLesson(userId, lessonId);

        return NextResponse.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Delete lesson error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
