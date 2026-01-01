import { CourseManagementService } from '../services/CourseManagementService';
import { CourseRepository } from '../repositories/CourseRepository';
import { SectionRepository } from '../repositories/SectionRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { BulkCourseContentDto } from '../dtos/BulkCourseContentDto';
import { LessonPreviewDto } from '../services/ContentManagementService';
import { prisma } from '../../../shared/config/database';

export class CourseManagementController {
    private service: CourseManagementService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        const sectionRepo = new SectionRepository(prisma);
        const lessonRepo = new LessonRepository(prisma);
        this.service = new CourseManagementService(courseRepo, sectionRepo, lessonRepo);
    }

    async deleteSection(userId: bigint, sectionId: bigint) {
        await this.service.deleteSection(userId, sectionId);
    }

    async syncCourseContent(userId: bigint, courseId: bigint, dto: BulkCourseContentDto) {
        await this.service.syncCourseContent(userId, courseId, dto);
    }

    async submitForApproval(userId: bigint, courseId: bigint) {
        await this.service.submitForApproval(userId, courseId);
    }

    async getLessonPreview(courseId: bigint, lessonId: bigint): Promise<LessonPreviewDto> {
        return await this.service.getLessonPreview(courseId, lessonId);
    }
}
