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
            courseId: section.course_id,
            ownerId: section.course_id, // Assuming owner is lecturer of course, but need to adjust
            // Add other fields
        };
    }

    async countByCourse(courseId: bigint): Promise<number> {
        return await this.prisma.chapters.count({
            where: { course_id: courseId },
        });
    }

    async deleteWithLessons(sectionId: bigint) {
        // Cascade delete lessons first
        await this.prisma.lessons.deleteMany({
            where: { chapter_id: sectionId },
        });
        await this.prisma.chapters.delete({
            where: { id: sectionId },
        });
    }
}
