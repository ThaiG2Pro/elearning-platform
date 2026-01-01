import { NextRequest, NextResponse } from 'next/server';
import { CourseManagementController } from '../../../../../../../modules/course-management/controllers/CourseManagementController';
import { getUserIdFromRequest } from '../../../../../../../shared/middleware/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const controller = new CourseManagementController();
        await controller.submitForApproval(userId, courseId);

        return NextResponse.json({
            message: 'Course submitted for approval successfully',
            status: 'PENDING'
        });
    } catch (error) {
        console.error('Error submitting course for approval:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
