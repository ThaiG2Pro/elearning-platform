import { NextRequest, NextResponse } from 'next/server';
import { ApprovalController } from '@/modules/course-management/controllers/ApprovalController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const adminId = await getUserIdFromRequest(request);
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const controller = new ApprovalController();
        const pendingCourses = await controller.getPendingCourses();

        return NextResponse.json(pendingCourses);
    } catch (error) {
        console.error('Get pending courses error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
