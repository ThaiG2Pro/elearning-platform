import { prisma } from '../../../shared/config/database';
import { AIGenerationService, GenerateRequest, GenerateResult } from '../services/AIGenerationService';
import { AIGenerationRepository } from '../repositories/AIGenerationRepository';
import { YoutubeTranscriptPlusProvider } from '../services/YoutubeTranscriptPlusProvider';
import { GeminiProvider } from '../services/GeminiProvider';

export class AIGenerationController {
    private service: AIGenerationService;

    constructor() {
        const repo = new AIGenerationRepository(prisma);
        this.service = new AIGenerationService(
            prisma,
            repo,
            new YoutubeTranscriptPlusProvider(),
            new GeminiProvider(),
        );
    }

    async generate(req: GenerateRequest): Promise<GenerateResult> {
        return this.service.generate(req);
    }
}
