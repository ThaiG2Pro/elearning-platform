import { PrismaClient } from '@prisma/client';
import { KeySource, Visibility } from '../domain/AIGenerationPolicy';

export interface AIGenerationRecord {
    id: bigint;
    sourceId: bigint;
    recipeHash: string;
    recipeType: string;
    isDefaultRecipe: boolean;
    keySource: KeySource;
    generatedByUserId: bigint | null;
    visibility: Visibility;
    status: 'PENDING' | 'READY' | 'FAILED';
    modelVersion: string;
    content: string | null;
    error: string | null;
}

export interface CreateAIGenerationInput {
    sourceId: bigint;
    recipeHash: string;
    recipeType: string;
    isDefaultRecipe: boolean;
    keySource: KeySource;
    generatedByUserId: bigint | null;
    visibility: Visibility;
    modelVersion: string;
}

function toRecord(row: {
    id: bigint;
    source_id: bigint;
    recipe_hash: string;
    recipe_type: string;
    is_default_recipe: boolean;
    key_source: string;
    generated_by_user_id: bigint | null;
    visibility: string;
    status: string;
    model_version: string;
    content: string | null;
    error: string | null;
}): AIGenerationRecord {
    return {
        id: row.id,
        sourceId: row.source_id,
        recipeHash: row.recipe_hash,
        recipeType: row.recipe_type,
        isDefaultRecipe: row.is_default_recipe,
        keySource: row.key_source as KeySource,
        generatedByUserId: row.generated_by_user_id,
        visibility: row.visibility as Visibility,
        status: row.status as 'PENDING' | 'READY' | 'FAILED',
        modelVersion: row.model_version,
        content: row.content,
        error: row.error,
    };
}

export class AIGenerationRepository {
    constructor(private prisma: PrismaClient) { }

    /** Tra cache SHARED_FREE mặc định — mục 4 nhánh 2 economics doc. */
    async findDefaultCache(sourceId: bigint, recipeHash: string): Promise<AIGenerationRecord | null> {
        const row = await this.prisma.ai_generations.findFirst({
            where: { source_id: sourceId, recipe_hash: recipeHash, key_source: 'SHARED_FREE' },
        });
        return row ? toRecord(row) : null;
    }

    /** Tra bản SHARED-BYOK trùng recipe tuỳ biến — mục 4 nhánh 3. */
    async findSharedByokMatch(sourceId: bigint, recipeHash: string): Promise<AIGenerationRecord | null> {
        const row = await this.prisma.ai_generations.findFirst({
            where: {
                source_id: sourceId,
                recipe_hash: recipeHash,
                key_source: 'BYOK',
                visibility: 'SHARED',
            },
        });
        return row ? toRecord(row) : null;
    }

    async create(input: CreateAIGenerationInput): Promise<AIGenerationRecord> {
        const row = await this.prisma.ai_generations.create({
            data: {
                source_id: input.sourceId,
                recipe_hash: input.recipeHash,
                recipe_type: input.recipeType,
                is_default_recipe: input.isDefaultRecipe,
                key_source: input.keySource,
                generated_by_user_id: input.generatedByUserId,
                visibility: input.visibility,
                model_version: input.modelVersion,
                status: 'PENDING',
            },
        });
        return toRecord(row);
    }

    async markReady(id: bigint, content: string): Promise<void> {
        await this.prisma.ai_generations.update({
            where: { id },
            data: { status: 'READY', content },
        });
    }

    async markFailed(id: bigint, error: string): Promise<void> {
        await this.prisma.ai_generations.update({
            where: { id },
            data: { status: 'FAILED', error },
        });
    }

    /** Mục 6.1 — đếm số lần user này kích hoạt AI (bất kỳ recipe) trong hôm nay. */
    async countActivationsToday(userId: bigint): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return this.prisma.ai_generations.count({
            where: { generated_by_user_id: userId, created_at: { gte: startOfDay } },
        });
    }

    // Mục 6.7/WP2.4 (alerting theo ngày/tuần): truy vấn tương ứng sống trong
    // scripts/aiUsageReport.ts, không lặp lại ở đây — script đó không thể
    // import từ src/ (ràng buộc ts-node ESM, xem comment trong file đó), nên
    // để 1 nơi giữ query thay vì 2 bản dễ lệch nhau.
}
