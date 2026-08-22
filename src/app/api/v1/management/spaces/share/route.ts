import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/** WP1.5.11: list the caller's own spaces with their current share status — backs /my-shares. */
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const controller = new ManagementController();
        const spaces = await controller.listMyShareLinks(userId);

        const origin = process.env.FRONTEND_URL || request.nextUrl.origin;
        return NextResponse.json(
            spaces.map(c => ({
                ...c,
                shareUrl: c.shareToken ? `${origin}/share/${c.shareToken}` : null,
            }))
        );
    } catch (error) {
        console.error('List share links error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
