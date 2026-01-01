import { NextRequest, NextResponse } from 'next/server';
import { EnrollmentController } from '@/modules/course-management/controllers/EnrollmentController';
import { getUserIdFromRequest, getUserFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const controller = new EnrollmentController();
        const isEnrolled = await controller.checkEnrollmentStatus(userId, courseId);

        return NextResponse.json({ enrolled: isEnrolled });
    } catch (error) {
        console.error('Error checking enrollment status:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // BR-ENROLL-02: Role Restriction - Only students can enroll
        if (user.role !== 'STUDENT') {
            return NextResponse.json({ error: 'ROLE_DENIED', message: 'Only students can enroll' }, { status: 403 });
        }

        const courseId = BigInt(params.id);
        const controller = new EnrollmentController();
        const result = await controller.enrollStudent(user.id, courseId);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error enrolling student:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
