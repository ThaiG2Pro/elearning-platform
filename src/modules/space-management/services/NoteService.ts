import { NoteRepository } from '../repositories/NoteRepository';
import { Note } from '../domain/Note';
import { PrismaClient } from '@prisma/client';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';

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
        // WP1.6 follow-up — dropped the dead `_enrollmentRepo` compatibility
        // param and its matching call-site arg.
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

        // Security — lessonId chỉ là 1 route param, tự nó không chứng minh
        // được quyền truy cập (giống assertLessonAccess bên QuizService):
        // trước khi findSpaceIdByLesson chỉ trả về spaceId, không hề kiểm
        // space đó có phải của userId hay không, nên bất kỳ user đăng nhập
        // nào cũng ghi được note lên lesson của người khác.
        const spaceId = await this.findSpaceIdByLesson(userId, lessonId);
        const note = Note.create(userId, spaceId, lessonId, trimmed, videoTimestampSec);
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

    private async findSpaceIdByLesson(userId: bigint, lessonId: bigint): Promise<bigint> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { space: true } } },
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        // Cùng chính sách sở hữu với QuizService.assertLessonAccess: space là
        // của cá nhân, "học viên" của 1 space share thực chất học trên bản
        // clone họ tự sở hữu — nên ghi note vào lesson chỉ hợp lệ khi userId
        // chính là owner của space chứa lesson đó.
        AccessControlPolicy.validateOwnership(userId, lesson.chapter.space.owner_id);

        return lesson.chapter.space.id;
    }
}
