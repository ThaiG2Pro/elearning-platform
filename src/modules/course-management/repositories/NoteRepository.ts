import { PrismaClient } from '@prisma/client';
import { Note } from '../domain/Note';

export class NoteRepository {
    constructor(private prisma: PrismaClient) { }

    async findByStudentAndLesson(studentId: bigint, lessonId: bigint): Promise<Note | null> {
        const progress = await this.prisma.learning_progress.findFirst({
            where: {
                enrollment: {
                    student_id: studentId,
                },
                lesson_id: lessonId,
            },
            include: {
                enrollment: true,
            },
        });

        if (!progress || !progress.personal_note) return null;

        // Map learning_progress to Note
        return new Note(
            progress.id, // Use progress id as note id
            progress.enrollment_id,
            progress.lesson_id,
            progress.personal_note,
            progress.enrollment.enrolled_at || new Date(), // created_at
            progress.enrollment.enrolled_at || new Date(), // updated_at
        );
    }

    async save(note: Note): Promise<Note> {
        // Update personal_note in learning_progress
        const updated = await this.prisma.learning_progress.update({
            where: { id: note.id! },
            data: {
                personal_note: note.content,
            },
            include: {
                enrollment: true,
            },
        });

        return new Note(
            updated.id,
            updated.enrollment_id,
            updated.lesson_id,
            updated.personal_note || '',
            updated.enrollment.enrolled_at || new Date(),
            updated.enrollment.enrolled_at || new Date(),
        );
    }

    async create(note: Note): Promise<Note> {
        // First ensure learning_progress exists
        let progress = await this.prisma.learning_progress.findFirst({
            where: {
                enrollment_id: note.enrollmentId,
                lesson_id: note.lessonId,
            },
            include: {
                enrollment: true,
            },
        });

        if (!progress) {
            // Create learning_progress if not exists
            progress = await this.prisma.learning_progress.create({
                data: {
                    enrollment_id: note.enrollmentId,
                    lesson_id: note.lessonId,
                    is_finished: false,
                    personal_note: note.content,
                },
                include: {
                    enrollment: true,
                },
            });
        } else {
            // Update existing
            progress = await this.prisma.learning_progress.update({
                where: { id: progress.id },
                data: {
                    personal_note: note.content,
                },
                include: {
                    enrollment: true,
                },
            });
        }

        return new Note(
            progress.id,
            progress.enrollment_id,
            progress.lesson_id,
            progress.personal_note || '',
            progress.enrollment.enrolled_at || new Date(),
            progress.enrollment.enrolled_at || new Date(),
        );
    }
}
