import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateSectionDto } from '@/modules/space-management/dtos/ContentDto';
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

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        const spaceId = BigInt(params.id);

        // Ensure space exists
        const space = await prisma.spaces.findUnique({ where: { id: spaceId } });
        if (!space) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        // Ensure owner
        if (space.owner_id !== userId) {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }

        // Personal-organizer model: the owner can always view/edit their
        // space's sections, active or not — no approval-driven lock.

        const controller = new ManagementController();
        const sections = await controller.getSpaceSections(spaceId);

        // Found while smoke-testing this file's ownership check (WP1.6
        // follow-up): SectionDto/LessonDto ids are bigint and this route
        // never had a lecturer_id-style BigInt→Number pass over them like
        // its sibling GET /management/spaces does — every call crashed
        // JSON.stringify. Zero frontend callers currently hit this GET (only
        // the POST below is used), so it silently never surfaced.
        const safeSections = JSON.parse(JSON.stringify(sections, (_key, value) =>
            typeof value === 'bigint' ? Number(value) : value
        ));

        // Guarantee stable contract: always return an object with spaceId, status and sections array
        return NextResponse.json({
            spaceId: Number(space.id),
            status: (space.status || 'ACTIVE').toUpperCase(),
            sections: Array.isArray(safeSections) ? safeSections : []
        });
    } catch (error) {
        console.error('Get space sections error:', error);
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

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        const spaceId = BigInt(params.id);
        const body: CreateSectionDto = await request.json();

        // Authorization & business checks
        const space = await prisma.spaces.findUnique({ where: { id: spaceId } });
        if (!space) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        // Ensure the requester is the owner
        if (space.owner_id !== userId) {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }

        // Owner can add sections at any time — no approval-driven lock.

        const controller = new ManagementController();
        const sectionId = await controller.createSection(userId, spaceId, body);

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
