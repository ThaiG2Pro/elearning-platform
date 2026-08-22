import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserFromRequest } from '@/shared/middleware/auth';
import { CreateSpaceDto } from '@/modules/space-management/dtos/SpaceManagementDto';

export async function GET(request: NextRequest) {
    try {
        // WP1.5.10: ownership-based, not role-gated — every user owns their
        // own personal spaces now (see ContentManagementService.getOwnedSpaces,
        // which already filters by owner_id). The old LECTURER-only check
        // sent every STUDENT into a 401 when they clicked "Khóa học đã tạo".
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const controller = new ManagementController();
        const spaces = await controller.getOwnedSpaces(user.id, status);

        // Convert BigInt fields to strings to avoid JSON serialization errors
        const safeSpaces = (spaces || []).map((c: any) => {
            // Convert bigint id into a number when safe, otherwise a string
            let safeId: number | string = c.id;
            if (typeof c.id === 'bigint') {
                const asNumber = Number(c.id);
                safeId = Number.isSafeInteger(asNumber) ? asNumber : c.id.toString();
            }
            return {
                ...c,
                id: safeId
            };
        });

        return NextResponse.json(safeSpaces);
    } catch (error) {
        console.error('Get owned spaces error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // WP1.5.10: any authenticated user can create their own personal space.
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CreateSpaceDto = await request.json();

        const controller = new ManagementController();
        const spaceId = await controller.createSpace(user.id, body);

        // Convert BigInt to string for safe JSON serialization
        // Return stable contract including initial status — spaces are
        // active immediately, there is no draft/approval gate anymore.
        return NextResponse.json({ spaceId: spaceId.toString(), status: 'ACTIVE' }, { status: 201 });
    } catch (error) {
        console.error('Create space error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
