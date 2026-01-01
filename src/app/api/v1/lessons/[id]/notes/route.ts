import { NextRequest, NextResponse } from 'next/server';
import { LearnController } from '@/modules/course-management/controllers/LearnController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

// Duplicate of /note route for FE compatibility
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = BigInt(params.id);
        const controller = new LearnController();
        const note = await controller.getNote(userId, lessonId);

        if (!note) {
            return NextResponse.json({ content: '', updatedAt: null }, { status: 200 });
        }

        return NextResponse.json(note, { status: 200 });
    } catch (error) {
        console.error('Error getting note:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await request.json();

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        const lessonId = BigInt(params.id);
        const controller = new LearnController();
        await controller.saveNote(userId, lessonId, content);

        return NextResponse.json({ status: 'SAVED' }, { status: 200 });
    } catch (error) {
        console.error('Error saving note:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
