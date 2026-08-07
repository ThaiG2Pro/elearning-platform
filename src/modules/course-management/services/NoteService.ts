import { NoteRepository } from '../repositories/NoteRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { Note } from '../domain/Note';
import { PrismaClient } from '@prisma/client';

export interface NoteView {
    id: string;
    content: string;
    videoTimestampSec: number | null;
    createdAt: string;
    updatedAt: string;
}

/** WP1.5.4: many notes per (userId, lessonId), each optionally timestamped. */
export class NoteService {
    constructor(
        private noteRepo: NoteRepository,
        // Accepted only for constructor-shape compatibility with existing call sites.
        _enrollmentRepo: EnrollmentRepository | undefined,
        private prisma: PrismaClient,
    ) { }

    async addNote(userId: bigint, lessonId: bigint, content: string, videoTimestampSec: number | null): Promise<NoteView> {
        const trimmed = content.trim();
        if (!trimmed) {
            throw new Error('NOTE_EMPTY');
        }
        if (trimmed.length > 1000) {
            throw new Error('NOTE_TOO_LONG');
        }

        const courseId = await this.findCourseIdByLesson(lessonId);
        const note = Note.create(userId, courseId, lessonId, trimmed, videoTimestampSec);
        const saved = await this.noteRepo.create(note);
        return this.toView(saved);
    }

    async listNotes(userId: bigint, lessonId: bigint): Promise<NoteView[]> {
        const notes = await this.noteRepo.findAllByUserAndLesson(userId, lessonId);
        return notes.map(n => this.toView(n));
    }

    /** Throws FORBIDDEN if the note isn't owned by userId, NOTE_NOT_FOUND if it doesn't exist. */
    async deleteNote(userId: bigint, noteId: bigint): Promise<void> {
        const note = await this.noteRepo.findById(noteId);
        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }
        if (note.userId !== userId) {
            throw new Error('FORBIDDEN');
        }
        await this.noteRepo.delete(noteId);
    }

    private toView(note: Note): NoteView {
        return {
            id: note.id!.toString(),
            content: note.content,
            videoTimestampSec: note.videoTimestampSec,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
        };
    }

    private async findCourseIdByLesson(lessonId: bigint): Promise<bigint> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } },
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        return lesson.chapter.course.id;
    }
}
