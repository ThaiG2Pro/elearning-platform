import { NextRequest, NextResponse } from 'next/server';
import { ManagementController, TrackProgressDto } from '../../../../../../modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '../../../../../../shared/middleware/auth';

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: TrackProgressDto = await request.json();

        // Basic validation
        if (!body.lessonId || typeof body.position !== 'number' || typeof body.duration !== 'number') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const controller = new ManagementController();
        const result = await controller.trackVideoProgress(userId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error tracking video progress:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
