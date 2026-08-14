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

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'COURSE_NOT_FOUND' }, { status: 404 });
        }

        const courseId = BigInt(params.id);
        const body: { title?: string; description?: string; status?: string } = await request.json();

        // WP1.6 follow-up (round 3) — `status` (archive/unarchive) now shares
        // this same update path; a request may carry only `status` with no
        // title/description, so the "Title is required" guard below must not
        // reject it.
        if (body.status !== undefined && body.status !== 'ACTIVE' && body.status !== 'ARCHIVED') {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Validate input
        if (!body.title?.trim() && body.description === undefined && body.status === undefined) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const controller = new ManagementController();
        await controller.updateCourseMetadata(userId, courseId, {
            title: body.title,
            description: body.description,
            status: body.status as 'ACTIVE' | 'ARCHIVED' | undefined,
        });

        return NextResponse.json({ message: 'Course updated successfully' });
    } catch (error) {
        console.error('Error updating course:', error);
        // Found while smoke-testing this route (WP1.6 follow-up): ACCESS_DENIED
        // (a non-owner editing someone else's course) fell into the generic
        // catch-all and came back as 500 instead of 403 — same class of bug
        // fixed for the quiz-upload route in WP1.6.4.
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED', message: 'Bạn không sở hữu Space này' }, { status: 403 });
        }
        if (error instanceof Error && error.message === 'COURSE_NOT_FOUND') {
            return NextResponse.json({ error: 'COURSE_NOT_FOUND' }, { status: 404 });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
