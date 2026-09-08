import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { parseIdParam } from '@/shared/http/params';

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

        const controller = new SpaceController();
        const space = await controller.getSpaceDetail(spaceId, userId || undefined);

        if (!space) {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }

        return NextResponse.json(space);
    } catch (error: any) {
        if (error?.message === 'SPACE_NOT_FOUND' || error?.message === 'Space not found') {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }

        console.error('Get space detail error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
