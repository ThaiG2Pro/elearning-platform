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
        const result = await controller.createCourseFromLink(userId, body.url);

        return NextResponse.json({
            courseId: result.courseId.toString(),
            title: result.title,
            titleIsPlaceholder: result.titleIsPlaceholder,
            status: 'ACTIVE',
        }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        // WP1.10.2 — oEmbed failing no longer blocks creation (service falls
        // back to a placeholder title instead of throwing), so
        // YOUTUBE_METADATA_FETCH_FAILED/422 no longer happens here. Playlist
        // URLs get their own distinct, clearly-worded rejection instead of
        // falling through to the generic UNSUPPORTED_URL message.
        if (message === 'UNSUPPORTED_URL' || message === 'URL_REQUIRED' || message === 'PLAYLIST_URL_NOT_SUPPORTED') {
            return NextResponse.json({ error: message }, { status: 400 });
        }
        console.error('Create course from link error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
