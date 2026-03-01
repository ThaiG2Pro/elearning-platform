import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateLessonDto } from '@/modules/course-management/dtos/ContentDto';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        await controller.updateLesson(lessonId, dto);

        return NextResponse.json({ message: 'Lesson updated successfully' });
    } catch (error) {
        console.error('Update lesson error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
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

        const lessonId = BigInt(params.id);

        const controller = new ManagementController();
        await controller.deleteLesson(lessonId);

        return NextResponse.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Delete lesson error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
