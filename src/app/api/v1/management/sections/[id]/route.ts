import { NextRequest, NextResponse } from 'next/server';
import { CourseManagementController } from '@/modules/course-management/controllers/CourseManagementController';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateSectionDto } from '@/modules/course-management/dtos/ContentDto';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
        }

        const sectionId = BigInt(params.id);
        const body: UpdateSectionDto = await request.json();

        const controller = new ManagementController();
        await controller.updateSection(userId, sectionId, body);

        return NextResponse.json({ message: 'Section updated successfully' });
    } catch (error) {
        console.error('Update section error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'SECTION_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'SECTION_NOT_FOUND' }, { status: 404 });
        }

        const sectionId = BigInt(params.id);
        const controller = new CourseManagementController();
        await controller.deleteSection(userId, sectionId);

        return NextResponse.json({ message: 'Section deleted successfully' });
    } catch (error) {
        console.error('Error deleting section:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'SECTION_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
