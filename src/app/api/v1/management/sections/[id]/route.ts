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

        const sectionId = BigInt(params.id);
        const body: UpdateSectionDto = await request.json();

        const controller = new ManagementController();
        await controller.updateSection(sectionId, body);

        return NextResponse.json({ message: 'Section updated successfully' });
    } catch (error) {
        console.error('Update section error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
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

        const sectionId = BigInt(params.id);
        const controller = new CourseManagementController();
        await controller.deleteSection(userId, sectionId);

        return NextResponse.json({ message: 'Section deleted successfully' });
    } catch (error) {
        console.error('Error deleting section:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
