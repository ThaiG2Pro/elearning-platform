import { PrismaClient } from '@prisma/client';
import { KeySource, Visibility } from '../domain/AIGenerationPolicy';

export interface AIGenerationRecord {
    id: bigint;
    sourceId: bigint;
    recipeHash: string;
    recipeType: 'summary' | 'quiz';
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
    recipeType: 'summary' | 'quiz';
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
        recipeType: row.recipe_type as 'summary' | 'quiz',
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

    /**
     * Tra cache SHARED_FREE mặc định — mục 4 nhánh 2 economics doc.
     *
     * Chỉ khớp `status: 'READY'`. Trước đây không lọc status: 1 lần
     * generate lỗi (proxy/model tạm thời hỏng, transcript timeout...) lưu
     * lại đúng 1 row `FAILED` — row đó sau này lại được chính hàm này trả
     * về như "cache hit" (`content: null`, `servedFromCache: true`), khiến
     * Source đó bị chặn tạo lại AI **vĩnh viễn**, kể cả sau khi nguyên nhân
     * lỗi gốc đã hết. Coi 1 row FAILED như "chưa có cache" để lần gọi kế
     * tiếp thử generate lại — đúng tinh thần "lỗi không được phép chặn
     * đường vĩnh viễn" của toàn bộ tính năng AI (luôn optional).
     */
    async findDefaultCache(sourceId: bigint, recipeHash: string): Promise<AIGenerationRecord | null> {
        const row = await this.prisma.ai_generations.findFirst({
            where: { source_id: sourceId, recipe_hash: recipeHash, key_source: 'SHARED_FREE', status: 'READY' },
        });
        return row ? toRecord(row) : null;
    }

    /** Tra bản SHARED-BYOK trùng recipe tuỳ biến — mục 4 nhánh 3. Cùng lý do
     *  chỉ khớp READY như `findDefaultCache` ở trên. */
    async findSharedByokMatch(sourceId: bigint, recipeHash: string): Promise<AIGenerationRecord | null> {
        const row = await this.prisma.ai_generations.findFirst({
            where: {
                source_id: sourceId,
                recipe_hash: recipeHash,
                key_source: 'BYOK',
                visibility: 'SHARED',
                status: 'READY',
            },
        });
        return row ? toRecord(row) : null;
    }

    /**
     * Dedup bản đang generate (contract sync — xem AIGenerationService.generate):
     * 1 row PENDING có updated_at đủ mới nghĩa là 1 request khác đang await LLM
     * cho đúng recipe này — request mới không được generate trùng (tốn thêm
     * quota/credits cho cùng 1 nội dung). PENDING cũ hơn `since` coi như mồ côi
     * (process chết giữa chừng trước khi markReady/markFailed) — không chặn,
     * để `create()` reset row đó về PENDING và generate lại.
     *
     * `userId = null` (SHARED_FREE): bản dùng chung, dedup toàn cục. Có userId
     * (BYOK/PAID_TIER): chỉ dedup double-click của chính user đó — không chặn
     * user khác tạo bản riêng của họ.
     */
    async findInFlight(
        sourceId: bigint,
        recipeHash: string,
        keySource: string,
        userId: bigint | null,
        since: Date,
    ): Promise<AIGenerationRecord | null> {
        const row = await this.prisma.ai_generations.findFirst({
            where: {
                source_id: sourceId,
                recipe_hash: recipeHash,
                key_source: keySource as 'SHARED_FREE' | 'BYOK' | 'PAID_TIER',
                status: 'PENDING',
                updated_at: { gte: since },
                ...(userId !== null ? { generated_by_user_id: userId } : {}),
            },
        });
        return row ? toRecord(row) : null;
    }

    async create(input: CreateAIGenerationInput): Promise<AIGenerationRecord> {
        // Ràng buộc 1 (partial unique index viết tay ở migration
        // 20260814180000, không biểu diễn được bằng Prisma schema syntax)
        // cho phép đúng 1 row (source_id, recipe_hash) khi key_source =
        // 'SHARED_FREE' — KHÔNG phân biệt status. `findDefaultCache` đúng khi
        // bỏ qua row FAILED (coi như chưa có cache), nhưng nếu cứ INSERT
        // thẳng ở đây thì retry sau lỗi luôn đụng unique constraint đó (row
        // FAILED cũ vẫn chiếm slot). Phải tái dùng đúng row cũ (reset về
        // PENDING, xoá content/error cũ) thay vì insert mới — mọi retry đi
        // qua đường update, không đường insert.
        if (input.keySource === 'SHARED_FREE') {
            const existing = await this.prisma.ai_generations.findFirst({
                where: { source_id: input.sourceId, recipe_hash: input.recipeHash, key_source: 'SHARED_FREE' },
            });
            if (existing) {
                const row = await this.prisma.ai_generations.update({
                    where: { id: existing.id },
                    data: {
                        status: 'PENDING',
                        content: null,
                        error: null,
                        generated_by_user_id: input.generatedByUserId,
                        model_version: input.modelVersion,
                    },
                });
                return toRecord(row);
            }
        }
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
