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

    /**
     * Replace the lesson set of a space with `lessons`.
     *
     * Security: every chapter id and every existing lesson id in the payload
     * is verified to belong to `spaceId` BEFORE anything is written. The
     * caller has only proven ownership of the space, not of the ids inside
     * the body, so without this check an owner could overwrite lessons in
     * someone else's space. Throws CHAPTER_NOT_IN_SPACE / LESSON_NOT_IN_SPACE.
     */
    async syncLessons(spaceId: bigint, lessons: Lesson[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // Get all chapter IDs for this space
            const chapters = await tx.chapters.findMany({
                where: { space_id: spaceId },
                select: { id: true },
            });
            const chapterIds: bigint[] = chapters.map((c: any) => c.id);
            const chapterIdSet = new Set(chapterIds.map(String));

            for (const lesson of lessons) {
                if (!chapterIdSet.has(String(lesson.chapterId))) {
                    throw new Error('CHAPTER_NOT_IN_SPACE');
                }
            }

            const existingLessons = lessons.filter(l => l.id !== null);
            const newLessons = lessons.filter(l => l.id === null);
            const keptIds = existingLessons.map(l => l.id!);

            if (keptIds.length > 0) {
                const owned = await tx.lessons.findMany({
                    where: { id: { in: keptIds }, chapter_id: { in: chapterIds } },
                    select: { id: true },
                });
                const ownedSet = new Set(owned.map((l: any) => String(l.id)));
                for (const id of keptIds) {
                    if (!ownedSet.has(String(id))) {
                        throw new Error('LESSON_NOT_IN_SPACE');
                    }
                }
            }

            // Delete only lessons no longer in the payload (preserves quiz FK references)
            const deleteWhere: any = { chapter_id: { in: chapterIds } };
            if (keptIds.length > 0) {
                deleteWhere.id = { notIn: keptIds };
            }
            await tx.lessons.deleteMany({ where: deleteWhere });

            // Update existing lessons in-place so quiz questions remain linked.
            // The where clause re-asserts space membership as a second guard.
            for (const lesson of existingLessons) {
                await tx.lessons.updateMany({
                    where: { id: lesson.id!, chapter_id: { in: chapterIds } },
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
                await tx.lessons.createMany({
                    data: newLessons.map(lesson => ({
                        chapter_id: lesson.chapterId,
                        title: lesson.title,
                        type: lesson.type,
                        content_url: lesson.contentUrl,
                        order_index: lesson.orderIndex,
                    })),
                });
            }
        });
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

    async findQuizQuestions(lessonId: bigint): Promise<{ id: bigint; content: string; options: string[]; answerKey?: string }[]> {
        const questions = await this.prisma.questions.findMany({
            where: { lesson_id: lessonId },
            orderBy: { id: 'asc' }
        });

        return questions.map(q => ({
            id: q.id,
            content: q.content,
            options: Array.isArray(q.options)
                ? (q.options as unknown[]).filter((o): o is string => typeof o === 'string')
                : [],
            answerKey: q.answer_key || undefined,
        }));
    }
}
