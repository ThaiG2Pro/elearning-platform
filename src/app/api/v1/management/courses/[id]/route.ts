import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const body: { title?: string; description?: string } = await request.json();

        // Validate input
        if (!body.title?.trim() && body.description === undefined) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const controller = new ManagementController();
        await controller.updateCourseMetadata(userId, courseId, {
            title: body.title,
            description: body.description,
        });

        return NextResponse.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error('Error updating course:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
