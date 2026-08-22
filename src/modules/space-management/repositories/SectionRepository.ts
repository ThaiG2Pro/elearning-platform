import { PrismaClient } from '@prisma/client';

export class SectionRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: bigint) {
        const section = await this.prisma.chapters.findUnique({
            where: { id },
        });
        if (!section) return null;
        return {
            id: section.id,
            spaceId: section.space_id,
            ownerId: section.space_id, // Assuming owner is the space's owner, but need to adjust
            // Add other fields
        };
    }

    async countBySpace(spaceId: bigint): Promise<number> {
        return await this.prisma.chapters.count({
            where: { space_id: spaceId },
        });
    }

    async deleteWithLessons(sectionId: bigint) {
        // Deleting `lessons` rows directly (as this always has) hits FK
        // RESTRICT from `questions`/`notes`/`learning_progress` the moment any
        // lesson in this chapter has quiz questions, learner notes, or
        // progress — none of those have onDelete: Cascade in the schema. Live
        // reproduced: deleting a chapter containing an uploaded quiz lesson
        // 500'd with "questions_lesson_id_fkey" before this fix. Same gap
        // existed in ContentManagementService.deleteLesson.
        const lessonIds = (await this.prisma.lessons.findMany({
            where: { chapter_id: sectionId },
            select: { id: true },
        })).map(l => l.id);

        await this.prisma.$transaction([
            this.prisma.questions.deleteMany({ where: { lesson_id: { in: lessonIds } } }),
            this.prisma.notes.deleteMany({ where: { lesson_id: { in: lessonIds } } }),
            this.prisma.learning_progress.deleteMany({ where: { lesson_id: { in: lessonIds } } }),
            this.prisma.lessons.deleteMany({ where: { chapter_id: sectionId } }),
            this.prisma.chapters.delete({ where: { id: sectionId } }),
        ]);
    }
}
