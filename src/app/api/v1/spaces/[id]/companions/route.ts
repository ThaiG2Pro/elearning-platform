import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { parseIdParam } from '@/shared/http/params';

/** WP1.7 — who else is learning this space's clone lineage, read-only. */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const spaceId = parseIdParam(params.id);
        if (spaceId === null) {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }

        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const controller = new SpaceController();
        const companions = await controller.getCompanions(spaceId, userId);

        return NextResponse.json({ companions });
    } catch (error: any) {
        if (error?.message === 'FORBIDDEN') {
            return NextResponse.json(
                { error: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        console.error('Get space companions error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
