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
    /** Số lần row này được trả qua USE_CACHE (SHARED_FREE hoặc SHARED-BYOK) — xem incrementReuseCount. */
    reuseCount: number;
}

/** Dòng cho trang "/my-ai-shares" — bản BYOK đang SHARED của 1 user, kèm thông tin video nguồn để hiển thị. */
export interface SharedAIGenerationSummary {
    id: bigint;
    recipeType: 'summary' | 'quiz';
    createdAt: Date;
    reuseCount: number;
    sourceId: bigint;
    sourceTitle: string | null;
    sourceUrl: string;
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
    reuse_count?: number;
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
        // Optional ở type input vì vài caller (findInFlight trên row PENDING
        // tối giản) không cần cột này — cột DB luôn có giá trị thật (default 0).
        reuseCount: row.reuse_count ?? 0,
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
     * 2026-09-05 — gọi khi `decideRouting` trả `USE_CACHE` (SHARED_FREE hoặc
     * SHARED-BYOK) cho đúng row này — nguồn dữ liệu cho trang "/my-ai-shares"
     * ("bản của bạn đã được dùng lại N lần"). `increment` ở tầng SQL, không
     * đọc-sửa-ghi ở app, nên nhiều request đồng thời cộng dồn đúng, không
     * mất lượt (race an toàn).
     */
    async incrementReuseCount(id: bigint): Promise<void> {
        await this.prisma.ai_generations.update({
            where: { id },
            data: { reuse_count: { increment: 1 } },
        });
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

    /**
     * 2026-09-05 — nguồn cho trang "/my-ai-shares": chỉ liệt kê bản BYOK
     * đang thực sự `SHARED` của đúng user này (không phải mọi bản BYOK họ
     * từng tạo — bản PRIVATE không có gì để "quản lý share"). Đã thu hồi
     * (PRIVATE) thì rơi khỏi danh sách này ở lần load sau, không hiện lại
     * dạng "đã thu hồi" — giữ trang đơn giản như "link chia sẻ của tôi".
     */
    async listSharedByUser(userId: bigint): Promise<SharedAIGenerationSummary[]> {
        const rows = await this.prisma.ai_generations.findMany({
            where: { generated_by_user_id: userId, key_source: 'BYOK', visibility: 'SHARED' },
            include: { source: true },
            orderBy: { created_at: 'desc' },
        });
        return rows.map((row) => ({
            id: row.id,
            recipeType: row.recipe_type as 'summary' | 'quiz',
            createdAt: row.created_at,
            reuseCount: row.reuse_count,
            sourceId: row.source_id,
            sourceTitle: row.source.title,
            sourceUrl: row.source.url,
        }));
    }

    /**
     * Thu hồi 1 bản BYOK đang SHARED (chuyển PRIVATE) — chỉ chính chủ mới
     * làm được, và chỉ áp dụng cho BYOK (SHARED_FREE/PAID_TIER không có
     * khái niệm "chủ sở hữu tự thu hồi" ở đây — xem AIGenerationPolicy).
     */
    async revokeShare(id: bigint, userId: bigint): Promise<void> {
        const row = await this.prisma.ai_generations.findUnique({ where: { id } });
        if (!row) throw new Error('AI_GENERATION_NOT_FOUND');
        if (row.generated_by_user_id !== userId) throw new Error('ACCESS_DENIED');
        if (row.key_source !== 'BYOK' || row.visibility !== 'SHARED') {
            throw new Error('AI_GENERATION_NOT_SHARED');
        }
        await this.prisma.ai_generations.update({
            where: { id },
            data: { visibility: 'PRIVATE' },
        });
    }
}
