import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserFromRequest } from '@/shared/middleware/auth';
import { CreateCourseDto } from '@/modules/course-management/dtos/CourseManagementDto';

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'LECTURER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const controller = new ManagementController();
        const courses = await controller.getLecturerCourses(user.id, status);

        // Convert BigInt fields to strings to avoid JSON serialization errors
        const safeCourses = (courses || []).map((c: any) => {
            // Convert bigint id into a number when safe, otherwise a string
            let safeId: number | string = c.id;
            if (typeof c.id === 'bigint') {
                const asNumber = Number(c.id);
                safeId = Number.isSafeInteger(asNumber) ? asNumber : c.id.toString();
            }
            return {
                ...c,
                id: safeId
            };
        });

        return NextResponse.json(safeCourses);
    } catch (error) {
        console.error('Get lecturer courses error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'LECTURER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CreateCourseDto = await request.json();

        const controller = new ManagementController();
        const courseId = await controller.createCourse(user.id, body);

        // Convert BigInt to string for safe JSON serialization
        return NextResponse.json({ courseId: courseId.toString() }, { status: 201 });
    } catch (error) {
        console.error('Create course error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
