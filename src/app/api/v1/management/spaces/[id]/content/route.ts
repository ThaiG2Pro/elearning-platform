import { NextRequest, NextResponse } from 'next/server';
import { SpaceManagementController } from '../../../../../../../modules/space-management/controllers/SpaceManagementController';
import { getUserIdFromRequest } from '../../../../../../../shared/middleware/auth';
import { BulkSpaceContentDto } from '../../../../../../../modules/space-management/dtos/BulkSpaceContentDto';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        const spaceId = BigInt(params.id);
        const body: BulkSpaceContentDto = await request.json();

        // Basic validation: accept either sections (structured) or lessons (flat). Both may be empty arrays.
        const hasSections = Array.isArray((body as any).sections);
        const hasLessons = Array.isArray((body as any).lessons);

        if (!hasSections && !hasLessons) {
            // Accept empty content as {} or { sections: [] } or { lessons: [] }
            // But require a JSON body
            if (!body || typeof body !== 'object') {
                return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
            }
        }

        const controller = new SpaceManagementController();
        await controller.syncSpaceContent(userId, spaceId, body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error syncing space content:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'SPACE_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
