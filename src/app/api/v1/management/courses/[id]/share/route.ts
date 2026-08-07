import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * Owner-only: get (and lazily create) the stable share link for a course.
 * WP1.4 — the main growth channel for Checkpoint 1, must stay stable across
 * upgrades once handed out (ROADMAP.md principle #3).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const controller = new ManagementController();
        const shareToken = await controller.getOrCreateShareLink(userId, courseId);

        const origin = process.env.FRONTEND_URL || request.nextUrl.origin;
        return NextResponse.json({
            shareToken,
            shareUrl: `${origin}/share/${shareToken}`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'COURSE_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        console.error('Create share link error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}

/** WP1.5.11: owner-only revoke — old share URL 404s immediately afterwards. */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const controller = new ManagementController();
        await controller.revokeShareLink(userId, courseId);

        return NextResponse.json({ status: 'REVOKED' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'COURSE_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        console.error('Revoke share link error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
