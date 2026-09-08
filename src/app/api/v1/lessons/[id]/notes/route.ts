import { NextRequest, NextResponse } from 'next/server';
import { LearnController } from '@/modules/space-management/controllers/LearnController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

// WP1.5.4: a lesson now has many notes (was a single text blob on
// learning_progress). GET lists them, POST adds a new one — no more
// upsert-a-single-row semantics.
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const controller = new LearnController();
        const notes = await controller.listNotes(userId, lessonId);

        return NextResponse.json(notes, { status: 200 });
    } catch (error) {
        console.error('Error listing notes:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const { content, videoTimestampSec } = await request.json();

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }
        const timestamp = typeof videoTimestampSec === 'number' && videoTimestampSec >= 0
            ? Math.floor(videoTimestampSec)
            : null;

        const controller = new LearnController();
        const note = await controller.addNote(userId, lessonId, content, timestamp);

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error('Error creating note:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'NOTE_EMPTY' || message === 'NOTE_TOO_LONG' ? 400
            : message === 'ACCESS_DENIED' ? 403
            : message === 'LESSON_NOT_FOUND' ? 404
            : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
