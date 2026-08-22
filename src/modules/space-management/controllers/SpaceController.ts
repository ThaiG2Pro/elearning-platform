import { SpaceService } from '../services/SpaceService';
import { ContentManagementService } from '../services/ContentManagementService';
import { LearnService } from '../services/LearnService';
import { SpaceRepository } from '../repositories/SpaceRepository';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { SpaceListDto } from '../dtos/SpaceListDto';
import { SpaceDetailDto, PublicSpaceDto } from '../dtos/SpaceDetailDto';
import { CompanionDto } from '../dtos/CompanionDto';
import { prisma } from '../../../shared/config/database';

export class SpaceController {
    private service: SpaceService;
    private contentService: ContentManagementService;

    constructor() {
        const spaceRepo = new SpaceRepository(prisma);
        const progressRepo = new LearningProgressRepository(prisma);
        const learnService = new LearnService(progressRepo, prisma);
        this.service = new SpaceService(spaceRepo, learnService);
        this.contentService = new ContentManagementService(spaceRepo, prisma);
    }

    async getSpaces(search?: string): Promise<SpaceListDto[]> {
        return await this.service.getSpaces(search);
    }

    async getSpaceDetail(spaceId: bigint, userId?: bigint): Promise<SpaceDetailDto | null> {
        return await this.service.getSpaceDetail(spaceId, userId);
    }

    async getSpaceByShareToken(token: string): Promise<PublicSpaceDto> {
        return await this.contentService.getPublicSpaceByToken(token);
    }

    async cloneSharedSpace(token: string, userId: bigint): Promise<bigint> {
        return await this.contentService.cloneSharedSpace(token, userId);
    }

    async getCompanions(spaceId: bigint, userId: bigint): Promise<CompanionDto[]> {
        return await this.service.getCompanions(spaceId, userId);
    }
}
