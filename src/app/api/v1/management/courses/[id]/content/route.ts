import { NextRequest, NextResponse } from 'next/server';
import { CourseManagementController } from '../../../../../../../modules/course-management/controllers/CourseManagementController';
import { getUserIdFromRequest } from '../../../../../../../shared/middleware/auth';
import { BulkCourseContentDto } from '../../../../../../../modules/course-management/dtos/BulkCourseContentDto';

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
        const body: BulkCourseContentDto = await request.json();

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

        const controller = new CourseManagementController();
        await controller.syncCourseContent(userId, courseId, body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error syncing course content:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
