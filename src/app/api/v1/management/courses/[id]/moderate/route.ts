import { NextRequest, NextResponse } from 'next/server';
import { ApprovalController } from '../../../../../../../modules/course-management/controllers/ApprovalController';
import { getUserIdFromRequest } from '../../../../../../../shared/middleware/auth';
import { ModerateCourseDto } from '../../../../../../../modules/course-management/dtos/ModerateCourseDto';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const adminId = await getUserIdFromRequest(request);
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const body: ModerateCourseDto = await request.json();

        // Basic validation
        if (!body.action || !['APPROVE', 'REJECT'].includes(body.action)) {
            return NextResponse.json({ error: 'Invalid action. Must be APPROVE or REJECT' }, { status: 400 });
        }

        if (body.action === 'REJECT' && (!body.rejectNote || body.rejectNote.trim() === '')) {
            return NextResponse.json({ error: 'Reject note is required for rejection' }, { status: 400 });
        }

        const controller = new ApprovalController();
        await controller.moderateCourse(adminId, courseId, body);

        const newStatus = body.action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
        return NextResponse.json({
            message: `Course ${body.action.toLowerCase()}d successfully`,
            status: newStatus
        });
    } catch (error) {
        console.error('Error moderating course:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
