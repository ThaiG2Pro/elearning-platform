import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { applyRateLimit, UPLOAD_RATE_LIMITS } from '@/shared/middleware/rateLimit';

/**
 * WP1.1 — "dán link → tự parse metadata → tự tạo space" trong 1 bước,
 * thay cho việc tạo space rỗng rồi thêm từng bài thủ công.
 */
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const limited = applyRateLimit([
            { bucket: 'from-link:user', key: userId.toString(), ...UPLOAD_RATE_LIMITS.fromLinkPerUser },
        ]);
        if (limited) return limited;

        const body: { url?: string; confirmCreate?: boolean } = await request.json();
        if (!body.url?.trim()) {
            return NextResponse.json({ error: 'URL_REQUIRED' }, { status: 400 });
        }

        const controller = new ManagementController();
        const result = await controller.createSpaceFromLink(userId, body.url, { confirmCreate: body.confirmCreate === true });

        // 2026-09-11 — video đã có sẵn trong 1 showcase space: không tạo gì
        // cả, trả gợi ý để FE hỏi lại "Clone space này hay vẫn tạo mới?".
        if (result.type === 'SUGGESTION') {
            return NextResponse.json({
                type: 'SUGGESTION',
                suggestedSpace: {
                    spaceId: result.suggestedSpace.spaceId.toString(),
                    title: result.suggestedSpace.title,
                    shareToken: result.suggestedSpace.shareToken,
                    lessonCount: result.suggestedSpace.lessonCount,
                },
            }, { status: 200 });
        }

        return NextResponse.json({
            type: 'CREATED',
            spaceId: result.spaceId.toString(),
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
        console.error('Create space from link error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
