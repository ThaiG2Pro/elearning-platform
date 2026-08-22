import { PrismaClient } from '@prisma/client';
import { Note } from '../domain/Note';

/**
 * WP1.5.4: notes live in their own table now — many notes per lesson, each
 * optionally pinned to a video timestamp. Ownership check is always
 * (user_id, note_id), never lesson-only.
 */
export class NoteRepository {
    constructor(private prisma: PrismaClient) { }

    private toDomain(row: {
        id: bigint;
        user_id: bigint;
        lesson_id: bigint;
        space_id: bigint;
        content: string;
        video_timestamp_sec: number | null;
        created_at: Date;
        updated_at: Date;
    }): Note {
        return new Note(
            row.id,
            row.user_id,
            row.space_id,
            row.lesson_id,
            row.content,
            row.video_timestamp_sec,
            row.created_at,
            row.updated_at,
        );
    }

    async findAllByUserAndLesson(userId: bigint, lessonId: bigint): Promise<Note[]> {
        const rows = await this.prisma.notes.findMany({
            where: { user_id: userId, lesson_id: lessonId },
            orderBy: [{ video_timestamp_sec: 'asc' }, { created_at: 'asc' }],
        });
        return rows.map(r => this.toDomain(r));
    }

    async findById(noteId: bigint): Promise<Note | null> {
        const row = await this.prisma.notes.findUnique({ where: { id: noteId } });
        return row ? this.toDomain(row) : null;
    }

    async create(note: Note): Promise<Note> {
        const row = await this.prisma.notes.create({
            data: {
                user_id: note.userId,
                lesson_id: note.lessonId,
                space_id: note.spaceId,
                content: note.content,
                video_timestamp_sec: note.videoTimestampSec,
            },
        });
        return this.toDomain(row);
    }

    async delete(noteId: bigint): Promise<void> {
        await this.prisma.notes.delete({ where: { id: noteId } });
    }
}
