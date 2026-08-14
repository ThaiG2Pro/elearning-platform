import { NextRequest, NextResponse } from 'next/server';
import { CourseController } from '@/modules/course-management/controllers/CourseController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/** WP1.7 — who else is learning this course's clone lineage, read-only. */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json(
                { error: 'COURSE_NOT_FOUND' },
                { status: 404 }
            );
        }

        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const courseId = BigInt(params.id);
        const controller = new CourseController();
        const companions = await controller.getCompanions(courseId, userId);

        return NextResponse.json({ companions });
    } catch (error: any) {
        if (error?.message === 'FORBIDDEN') {
            return NextResponse.json(
                { error: 'FORBIDDEN' },
                { status: 403 }
            );
        }

        console.error('Get course companions error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
