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
        // Found while smoke-testing this route (WP1.6 follow-up): ACCESS_DENIED
        // (a non-owner editing someone else's course) fell into the generic
        // catch-all and came back as 500 instead of 403 — same class of bug
        // fixed for the quiz-upload route in WP1.6.4.
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED', message: 'Bạn không sở hữu khóa học này' }, { status: 403 });
        }
        if (error instanceof Error && error.message === 'COURSE_NOT_FOUND') {
            return NextResponse.json({ error: 'COURSE_NOT_FOUND' }, { status: 404 });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
