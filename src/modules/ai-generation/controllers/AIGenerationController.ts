import { prisma } from '../../../shared/config/database';
import { AIGenerationService, GenerateRequest, GenerateResult } from '../services/AIGenerationService';
import { AIGenerationRepository, SharedAIGenerationSummary } from '../repositories/AIGenerationRepository';
import { YoutubeTranscriptPlusProvider } from '../services/YoutubeTranscriptPlusProvider';
import { LiteLLMProvider } from '../services/LiteLLMProvider';
import { ReadabilityWebContentProvider } from '../services/ReadabilityWebContentProvider';
import { CreditRepository } from '../../billing/repositories/CreditRepository';
import { DataRetentionRepository } from '../../data-retention/repositories/DataRetentionRepository';

export class AIGenerationController {
    private service: AIGenerationService;

    constructor() {
        const repo = new AIGenerationRepository(prisma);
        this.service = new AIGenerationService(
            prisma,
            repo,
            new YoutubeTranscriptPlusProvider(),
            new LiteLLMProvider(),
            new ReadabilityWebContentProvider(),
            // WP4.1 — cho phép routing PAID_TIER thật (trước đây rơi vào
            // CHOICE_REQUIRED không có nhánh nào xử lý được).
            new CreditRepository(prisma),
            // WP4.2 — theo dõi "lần cuối thật sự được dùng" cho data retention.
            new DataRetentionRepository(prisma),
        );
    }

    async generate(req: GenerateRequest): Promise<GenerateResult> {
        return this.service.generate(req);
    }

    async listMySharedGenerations(userId: bigint): Promise<SharedAIGenerationSummary[]> {
        return this.service.listMySharedGenerations(userId);
    }

    async revokeSharedGeneration(userId: bigint, generationId: bigint): Promise<void> {
        return this.service.revokeSharedGeneration(userId, generationId);
    }
}
