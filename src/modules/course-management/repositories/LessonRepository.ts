import { PrismaClient } from '@prisma/client';
import { Lesson } from '../domain/Lesson';

export class LessonRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: bigint): Promise<Lesson | null> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id },
        });

        if (!lesson) return null;

        return new Lesson(
            lesson.id,
            lesson.chapter_id,
            lesson.title,
            lesson.type as any,
            lesson.content_url || '',
            lesson.order_index
        );
    }

    async findByChapterId(chapterId: bigint): Promise<Lesson[]> {
        const lessons = await this.prisma.lessons.findMany({
            where: { chapter_id: chapterId },
            orderBy: { order_index: 'asc' },
        });

        return lessons.map((lesson: any) => new Lesson(
            lesson.id,
            lesson.chapter_id,
            lesson.title,
            lesson.type as any,
            lesson.content_url || '',
            lesson.order_index
        ));
    }

    async syncLessons(courseId: bigint, lessons: Lesson[]): Promise<void> {
        // Get all chapter IDs for this course
        const chapters = await this.prisma.chapters.findMany({
            where: { course_id: courseId },
            select: { id: true },
        });
        const chapterIds = chapters.map((c: any) => c.id);

        const existingLessons = lessons.filter(l => l.id !== null);
        const newLessons = lessons.filter(l => l.id === null);
        const keptIds = existingLessons.map(l => l.id!);

        // Delete only lessons no longer in the payload (preserves quiz FK references)
        const deleteWhere: any = { chapter_id: { in: chapterIds } };
        if (keptIds.length > 0) {
            deleteWhere.id = { notIn: keptIds };
        }
        await this.prisma.lessons.deleteMany({ where: deleteWhere });

        // Update existing lessons in-place so quiz questions remain linked
        for (const lesson of existingLessons) {
            await this.prisma.lessons.update({
                where: { id: lesson.id! },
                data: {
                    title: lesson.title,
                    type: lesson.type,
                    order_index: lesson.orderIndex,
                    // Preserve quiz content_url (questions live in the questions table)
                    ...(lesson.type !== 'QUIZ' && { content_url: lesson.contentUrl }),
                },
            });
        }

        // Insert brand-new lessons
        if (newLessons.length > 0) {
            await this.prisma.lessons.createMany({
                data: newLessons.map(lesson => ({
                    chapter_id: lesson.chapterId,
                    title: lesson.title,
                    type: lesson.type,
                    content_url: lesson.contentUrl,
                    order_index: lesson.orderIndex,
                })),
            });
        }
    }

    async save(lesson: Lesson): Promise<Lesson> {
        const data = {
            chapter_id: lesson.chapterId,
            title: lesson.title,
            type: lesson.type,
            content_url: lesson.contentUrl,
            order_index: lesson.orderIndex,
        };

        if (lesson.id) {
            const updated = await this.prisma.lessons.update({
                where: { id: lesson.id },
                data,
            });
            return new Lesson(
                updated.id,
                updated.chapter_id,
                updated.title,
                updated.type as any,
                updated.content_url || '',
                updated.order_index
            );
        } else {
            const created = await this.prisma.lessons.create({
                data,
            });
            return new Lesson(
                created.id,
                created.chapter_id,
                created.title,
                created.type as any,
                created.content_url || '',
                created.order_index
            );
        }
    }

    async findQuizQuestions(lessonId: bigint): Promise<{ id: bigint; content: string; optionA: string; optionB: string; optionC: string; optionD: string; answerKey?: string }[]> {
        const questions = await this.prisma.questions.findMany({
            where: { lesson_id: lessonId },
            orderBy: { id: 'asc' }
        });

        return questions.map(q => ({
            id: q.id,
            content: q.content,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            answerKey: (q as any).answer_key || undefined,
        }));
    }
}
