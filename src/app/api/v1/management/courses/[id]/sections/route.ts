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

        // Ensure course exists
        const course = await prisma.courses.findUnique({ where: { id: courseId } });
        if (!course) {
            return NextResponse.json({ error: 'COURSE_NOT_FOUND' }, { status: 404 });
        }

        // Ensure owner
        if (course.owner_id !== userId) {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }

        // Personal-organizer model: the owner can always view/edit their
        // course's sections, active or not — no approval-driven lock.

        const controller = new ManagementController();
        const sections = await controller.getCourseSections(courseId);

        // Found while smoke-testing this file's ownership check (WP1.6
        // follow-up): SectionDto/LessonDto ids are bigint and this route
        // never had a lecturer_id-style BigInt→Number pass over them like
        // its sibling GET /management/courses does — every call crashed
        // JSON.stringify. Zero frontend callers currently hit this GET (only
        // the POST below is used), so it silently never surfaced.
        const safeSections = JSON.parse(JSON.stringify(sections, (_key, value) =>
            typeof value === 'bigint' ? Number(value) : value
        ));

        // Guarantee stable contract: always return an object with courseId, status and sections array
        return NextResponse.json({
            courseId: Number(course.id),
            status: (course.status || 'ACTIVE').toUpperCase(),
            sections: Array.isArray(safeSections) ? safeSections : []
        });
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

        // Ensure the requester is the owner
        if (course.owner_id !== userId) {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }

        // Owner can add sections at any time — no approval-driven lock.

        const controller = new ManagementController();
        const sectionId = await controller.createSection(userId, courseId, body);

        return NextResponse.json({
            sectionId: Number(sectionId),
            id: Number(sectionId),
            title: body.title,
            orderIndex: body.orderIndex ?? 0,
            lessons: [],
        }, { status: 201 });
    } catch (error) {
        console.error('Create section error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
