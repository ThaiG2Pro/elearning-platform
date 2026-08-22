import { NextRequest, NextResponse } from 'next/server';
import { LearnController } from '@/modules/space-management/controllers/LearnController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

// WP1.5.4/1.5.11: notes previously could never be deleted (no route at any
// layer). Ownership is enforced in NoteService.deleteNote.
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; noteId: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const noteId = BigInt(params.noteId);
        const controller = new LearnController();
        await controller.deleteNote(userId, noteId);

        return NextResponse.json({ status: 'DELETED' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting note:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'NOTE_NOT_FOUND' ? 404 : message === 'FORBIDDEN' ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
