import { NextRequest, NextResponse } from 'next/server';
import { ManagementController } from '@/modules/course-management/controllers/ManagementController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { CreateLessonDto } from '@/modules/course-management/dtos/ContentDto';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sectionId = BigInt(params.id);
        const body: CreateLessonDto = await request.json();

        const controller = new ManagementController();
        const lessonId = await controller.createLesson(sectionId, body);

        return NextResponse.json({ lessonId }, { status: 201 });
    } catch (error) {
        console.error('Create lesson error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
