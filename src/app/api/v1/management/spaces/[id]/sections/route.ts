import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/space-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateSectionDto } from '@/modules/space-management/dtos/ContentDto';
import { parseIdParam } from '@/shared/http/params';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const spaceId = parseIdParam(params.id);
        if (spaceId === null) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }

        // Security fix (issue 13) — ownership check giờ nằm trong
        // ContentManagementService.getSpaceSections (AccessControlPolicy),
        // cùng chỗ với mọi route quản trị khác, thay vì route tự query
        // prisma.spaces + so sánh owner_id (dễ trôi lệch nếu service đổi
        // logic mà quên đồng bộ 2 nơi). Personal-organizer model: the owner
        // can always view/edit their space's sections, active or not — no
        // approval-driven lock.
        const controller = new ManagementController();
        const { space, sections } = await controller.getSpaceSections(userId, spaceId);

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
        if (error instanceof Error && error.message === 'SPACE_NOT_FOUND') {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const spaceId = parseIdParam(params.id);
        if (spaceId === null) {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }
        const body: CreateSectionDto = await request.json();

        // Security fix (issue 13) — createSection tự làm ownership check
        // (AccessControlPolicy) rồi, route không cần tự query prisma.spaces
        // nữa. Owner can add sections at any time — no approval-driven lock.
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
        // Security — createSection giờ chặn title quá dài (Fix 8), trước đây
        // mọi lỗi từ service đều rơi vào 500 chung dù là lỗi input hợp lệ 400.
        if (error instanceof Error && error.message === 'TITLE_TOO_LONG') {
            return NextResponse.json({ error: 'TITLE_TOO_LONG' }, { status: 400 });
        }
        // Security fix (issue 13) — ownership check giờ ném từ service
        // (SPACE_NOT_FOUND/ACCESS_DENIED) thay vì route tự kiểm trước; cần
        // map 2 mã lỗi này ở đây, không thì rơi vào 500 chung.
        if (error instanceof Error && error.message === 'SPACE_NOT_FOUND') {
            return NextResponse.json({ error: 'SPACE_NOT_FOUND' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
        }
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
