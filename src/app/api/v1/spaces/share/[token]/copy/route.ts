import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * "Sao chép về học" — clones a shared space into the caller's own account.
 * Requires login (anonymous visitors are sent through /join first by the
 * frontend); the clone is fully independent of the original from this point.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const controller = new SpaceController();
        const spaceId = await controller.cloneSharedSpace(params.token, userId);

        return NextResponse.json({ spaceId: spaceId.toString() }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'SHARE_LINK_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        console.error('Clone shared space error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
