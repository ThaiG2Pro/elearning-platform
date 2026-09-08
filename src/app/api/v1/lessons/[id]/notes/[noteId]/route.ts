import { NextRequest, NextResponse } from 'next/server';
import { LearnController } from '@/modules/space-management/controllers/LearnController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

// WP1.5.4/1.5.11: notes previously could never be deleted (no route at any
// layer). Ownership is enforced in NoteService.deleteNote.
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string; noteId: string }> }
) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const noteId = parseIdParam(params.noteId);
        if (noteId === null) {
            return NextResponse.json({ error: 'NOTE_NOT_FOUND' }, { status: 404 });
        }
        const controller = new LearnController();
        await controller.deleteNote(userId, noteId);

        return NextResponse.json({ status: 'DELETED' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting note:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'NOTE_NOT_FOUND' ? 404 : message === 'FORBIDDEN' ? 403 : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
