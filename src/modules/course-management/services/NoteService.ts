import { NoteRepository } from '../repositories/NoteRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { Note } from '../domain/Note';
import { PrismaClient } from '@prisma/client';

export class NoteService {
    constructor(
        private noteRepo: NoteRepository,
        private enrollmentRepo: EnrollmentRepository,
        private prisma: PrismaClient,
    ) { }

    async saveNote(userId: bigint, lessonId: bigint, content: string): Promise<void> {
        // Validate content length (Rule 23)
        if (content.length > 1000) {
            throw new Error('NOTE_TOO_LONG');
        }

        // Find enrollment
        const enrollment = await this.findEnrollmentByLesson(userId, lessonId);
        if (!enrollment) {
            throw new Error('ENROLLMENT_NOT_FOUND');
        }

        // Check existence
        const existingNote = await this.noteRepo.findByStudentAndLesson(userId, lessonId);

        let noteToSave: Note;
        if (existingNote) {
            // Update
            existingNote.updateContent(content);
            noteToSave = existingNote;
        } else {
            // Create
            noteToSave = Note.create(enrollment.id!, lessonId, content);
        }

        // Persist
        if (existingNote) {
            await this.noteRepo.save(noteToSave);
        } else {
            await this.noteRepo.create(noteToSave);
        }
    }

    async getNote(userId: bigint, lessonId: bigint): Promise<{ content: string; updatedAt: string } | null> {
        // Find enrollment
        const enrollment = await this.findEnrollmentByLesson(userId, lessonId);
        if (!enrollment) {
            throw new Error('ENROLLMENT_NOT_FOUND');
        }

        const note = await this.noteRepo.findByStudentAndLesson(userId, lessonId);
        if (!note) {
            return null;
        }

        return {
            content: note.content,
            updatedAt: note.updatedAt.toISOString()
        };
    }

    private async findEnrollmentByLesson(userId: bigint, lessonId: bigint): Promise<any> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            include: {
                chapter: {
                    include: {
                        course: true
                    }
                }
            }
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        const courseId = lesson.chapter.course.id;
        return await this.enrollmentRepo.findByStudentAndCourse(userId, courseId);
    }
}
