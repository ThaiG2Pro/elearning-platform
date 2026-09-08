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
        // Security — trước đây route này spread thẳng `...rawBody` vào một
        // object gán type CreateLessonDto (chỉ là type annotation, không
        // thực sự chạy qua constructor) — bất kỳ field lạ nào trong JSON gửi
        // lên (id, sourceId, chapterId, ...) đều lọt xuống service nguyên
        // văn (mass assignment). Service hiện chỉ đọc đúng title/type/
        // orderIndex/contentUrl khi ghi Prisma nên chưa khai thác được,
        // nhưng đây là phòng thủ nhiều lớp — field nào không thuộc DTO phải
        // bị loại bỏ ngay tại route, không dựa vào service "tình cờ" không
        // đọc field lạ.
        //
        // Editor UI space-management refactor — the frontend has always
        // posted the video URL under the field name `videoUrl` (matching its
        // own form state); the sibling PUT (update) route already falls back
        // to `videoUrl` for this reason, kept here via the same fallback.
        const body = new CreateLessonDto(
            rawBody.title,
            rawBody.type,
            rawBody.orderIndex,
            rawBody.contentUrl ?? (rawBody.videoUrl || undefined),
        );

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
            : message === 'TITLE_TOO_LONG' || message === 'URL_TOO_LONG' || message === 'INVALID_LESSON_TYPE' || message === 'INVALID_CONTENT_URL' ? 400
            : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
