import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateSectionDto } from '@/modules/course-management/dtos/ContentDto';
import { prisma } from '@/shared/config/database';

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

        const controller = new ManagementController();
        const sections = await controller.getCourseSections(courseId);

        return NextResponse.json(sections);
    } catch (error) {
        console.error('Get course sections error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courseId = BigInt(params.id);
        const body: CreateSectionDto = await request.json();

        // Authorization & business checks
        const course = await prisma.courses.findUnique({ where: { id: courseId } });
        if (!course) {
            return NextResponse.json({ error: 'COURSE_NOT_FOUND' }, { status: 404 });
        }

        // Ensure the requester is the owner (lecturer)
        if (course.lecturer_id !== userId) {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }

        // Only allow adding sections when course is in DRAFT state
        if ((course.status || '').toUpperCase() !== 'DRAFT') {
            return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
        }

        const controller = new ManagementController();
        const sectionId = await controller.createSection(courseId, body);

        return NextResponse.json({ sectionId }, { status: 201 });
    } catch (error) {
        console.error('Create section error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
