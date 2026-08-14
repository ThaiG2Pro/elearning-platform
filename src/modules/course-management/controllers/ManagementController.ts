import { ContentManagementService } from '../services/ContentManagementService';
import { CourseRepository } from '../repositories/CourseRepository';
import { CreateCourseDto, CourseSummaryDto } from '../dtos/CourseManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto } from '../dtos/ContentDto';
import { prisma } from '../../../shared/config/database';

export class ManagementController {
    private contentService: ContentManagementService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        this.contentService = new ContentManagementService(courseRepo, prisma);
    }

    // Course Management
    async getOwnedCourses(ownerId: bigint, status?: string | null): Promise<CourseSummaryDto[]> {
        return await this.contentService.getOwnedCourses(ownerId, status);
    }

    async createCourse(ownerId: bigint, dto: CreateCourseDto): Promise<bigint> {
        return await this.contentService.createCourse(ownerId, dto);
    }

    async createCourseFromLink(ownerId: bigint, url: string): Promise<{ courseId: bigint; title: string; titleIsPlaceholder: boolean }> {
        return await this.contentService.createCourseFromLink(ownerId, url);
    }

    async updateCourseMetadata(ownerId: bigint, courseId: bigint, data: { title?: string; description?: string; status?: 'ACTIVE' | 'ARCHIVED' }): Promise<void> {
        return await this.contentService.updateCourseMetadata(ownerId, courseId, data);
    }

    async getOrCreateShareLink(userId: bigint, courseId: bigint): Promise<string> {
        return await this.contentService.getOrCreateShareLink(userId, courseId);
    }

    async revokeShareLink(userId: bigint, courseId: bigint): Promise<void> {
        await this.contentService.revokeShareLink(userId, courseId);
    }

    async listMyShareLinks(userId: bigint): Promise<Array<{ id: number; title: string; shareToken: string | null }>> {
        return await this.contentService.listMyShareLinks(userId);
    }

    // Section Management
    async getCourseSections(courseId: bigint): Promise<SectionDto[]> {
        return await this.contentService.getCourseSections(courseId);
    }

    async createSection(userId: bigint, courseId: bigint, dto: CreateSectionDto): Promise<bigint> {
        return await this.contentService.createSection(userId, courseId, dto);
    }

    async updateSection(userId: bigint, sectionId: bigint, dto: UpdateSectionDto): Promise<void> {
        await this.contentService.updateSection(userId, sectionId, dto);
    }

    // Lesson Management
    async createLesson(userId: bigint, sectionId: bigint, dto: CreateLessonDto): Promise<bigint> {
        return await this.contentService.createLesson(userId, sectionId, dto);
    }

    async updateLesson(userId: bigint, lessonId: bigint, dto: UpdateLessonDto): Promise<void> {
        await this.contentService.updateLesson(userId, lessonId, dto);
    }

    async deleteLesson(userId: bigint, lessonId: bigint): Promise<void> {
        await this.contentService.deleteLesson(userId, lessonId);
    }
}
