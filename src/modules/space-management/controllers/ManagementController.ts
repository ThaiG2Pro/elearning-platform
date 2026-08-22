import { ContentManagementService } from '../services/ContentManagementService';
import { SpaceRepository } from '../repositories/SpaceRepository';
import { CreateSpaceDto, SpaceSummaryDto } from '../dtos/SpaceManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto } from '../dtos/ContentDto';
import { prisma } from '../../../shared/config/database';

export class ManagementController {
    private contentService: ContentManagementService;

    constructor() {
        const spaceRepo = new SpaceRepository(prisma);
        this.contentService = new ContentManagementService(spaceRepo, prisma);
    }

    // Space Management
    async getOwnedSpaces(ownerId: bigint, status?: string | null): Promise<SpaceSummaryDto[]> {
        return await this.contentService.getOwnedSpaces(ownerId, status);
    }

    async createSpace(ownerId: bigint, dto: CreateSpaceDto): Promise<bigint> {
        return await this.contentService.createSpace(ownerId, dto);
    }

    async createSpaceFromLink(ownerId: bigint, url: string): Promise<{ spaceId: bigint; title: string; titleIsPlaceholder: boolean }> {
        return await this.contentService.createSpaceFromLink(ownerId, url);
    }

    async updateSpaceMetadata(ownerId: bigint, spaceId: bigint, data: { title?: string; description?: string; status?: 'ACTIVE' | 'ARCHIVED' }): Promise<void> {
        return await this.contentService.updateSpaceMetadata(ownerId, spaceId, data);
    }

    async getOrCreateShareLink(userId: bigint, spaceId: bigint): Promise<string> {
        return await this.contentService.getOrCreateShareLink(userId, spaceId);
    }

    async revokeShareLink(userId: bigint, spaceId: bigint): Promise<void> {
        await this.contentService.revokeShareLink(userId, spaceId);
    }

    async listMyShareLinks(userId: bigint): Promise<Array<{ id: number; title: string; shareToken: string | null }>> {
        return await this.contentService.listMyShareLinks(userId);
    }

    // Section Management
    async getSpaceSections(spaceId: bigint): Promise<SectionDto[]> {
        return await this.contentService.getSpaceSections(spaceId);
    }

    async createSection(userId: bigint, spaceId: bigint, dto: CreateSectionDto): Promise<bigint> {
        return await this.contentService.createSection(userId, spaceId, dto);
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
