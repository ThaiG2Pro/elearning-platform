import { NextRequest, NextResponse } from 'next/server';
import { CourseController } from '@/modules/course-management/controllers/CourseController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

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

        const courseId = BigInt(params.id);
        const userId = await getUserIdFromRequest(request);

        const controller = new CourseController();
        const course = await controller.getCourseDetail(courseId, userId || undefined);

        if (!course) {
            return NextResponse.json(
                { error: 'COURSE_NOT_FOUND' },
                { status: 404 }
            );
        }

        return NextResponse.json(course);
    } catch (error: any) {
        if (error?.message === 'COURSE_NOT_FOUND' || error?.message === 'Course not found') {
            return NextResponse.json(
                { error: 'COURSE_NOT_FOUND' },
                { status: 404 }
            );
        }

        console.error('Get course detail error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
