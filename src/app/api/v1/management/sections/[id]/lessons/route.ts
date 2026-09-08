import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateLessonDto } from '@/modules/space-management/dtos/ContentDto';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sectionId = parseIdParam(params.id);
        if (sectionId === null) {
            return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
        }
        const rawBody = await request.json();
        // Editor UI space-management refactor — the frontend has always
        // posted the video URL under the field name `videoUrl` (matching its
        // own form state), but this route forwarded the raw body straight
        // through to a raw-Prisma create that only reads `contentUrl`. The
        // sibling PUT (update) route already falls back to `videoUrl` for
        // this exact reason; this route never did, so every lesson created
        // through the "Thêm bài học" form has silently had no video attached
        // until a later edit-and-resave touched it. Applying the same
        // fallback here closes that gap.
        const body: CreateLessonDto = {
            ...rawBody,
            contentUrl: rawBody.contentUrl ?? (rawBody.videoUrl || undefined),
        };

        const controller = new ManagementController();
        const lesson = await controller.createLesson(userId, sectionId, body);

        return NextResponse.json(
            { lessonId: Number(lesson.id), sourceId: lesson.sourceId !== null ? Number(lesson.sourceId) : null },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create lesson error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403
            : message === 'SECTION_NOT_FOUND' ? 404
            : message === 'TITLE_TOO_LONG' || message === 'URL_TOO_LONG' || message === 'INVALID_LESSON_TYPE' ? 400
            : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
