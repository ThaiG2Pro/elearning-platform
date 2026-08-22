import { SpaceManagementService } from '../services/SpaceManagementService';
import { SpaceRepository } from '../repositories/SpaceRepository';
import { SectionRepository } from '../repositories/SectionRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { BulkSpaceContentDto } from '../dtos/BulkSpaceContentDto';
import { LessonPreviewDto } from '../services/ContentManagementService';
import { prisma } from '../../../shared/config/database';

export class SpaceManagementController {
    private service: SpaceManagementService;

    constructor() {
        const spaceRepo = new SpaceRepository(prisma);
        const sectionRepo = new SectionRepository(prisma);
        const lessonRepo = new LessonRepository(prisma);
        this.service = new SpaceManagementService(spaceRepo, sectionRepo, lessonRepo);
    }

    async deleteSection(userId: bigint, sectionId: bigint) {
        await this.service.deleteSection(userId, sectionId);
    }

    async syncSpaceContent(userId: bigint, spaceId: bigint, dto: BulkSpaceContentDto) {
        await this.service.syncSpaceContent(userId, spaceId, dto);
    }

    async getLessonPreview(spaceId: bigint, lessonId: bigint, user: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        return await this.service.getLessonPreview(spaceId, lessonId, user);
    }
}
