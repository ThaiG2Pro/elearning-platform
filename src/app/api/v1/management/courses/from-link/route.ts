import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * WP1.1 — "dán link → tự parse metadata → tự tạo course" trong 1 bước,
 * thay cho việc tạo course rỗng rồi thêm từng bài thủ công.
 */
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const body: { url?: string } = await request.json();
        if (!body.url?.trim()) {
            return NextResponse.json({ error: 'URL_REQUIRED' }, { status: 400 });
        }

        const controller = new ManagementController();
        const courseId = await controller.createCourseFromLink(userId, body.url);

        return NextResponse.json({ courseId: courseId.toString(), status: 'ACTIVE' }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'UNSUPPORTED_URL' || message === 'URL_REQUIRED') {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        if (message === 'YOUTUBE_METADATA_FETCH_FAILED') {
            return NextResponse.json({ error: message }, { status: 422 });
        }
        console.error('Create course from link error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
