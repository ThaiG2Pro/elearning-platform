import { PrismaClient } from '@prisma/client';
import { AIGenerationPolicy } from '../domain/AIGenerationPolicy';
import { RecipeHash } from '../domain/RecipeHash';
import { RecipeType, defaultParamsFor, defaultModel } from '../domain/Recipes';
import { AIGenerationRecord, AIGenerationRepository } from '../repositories/AIGenerationRepository';
import { TranscriptProvider } from './TranscriptProvider';
import { LLMProvider } from './LLMProvider';
import { YouTubeOEmbedAdapter } from '../../../shared/adapters/YouTubeOEmbedAdapter';

/**
 * WP2.2 — Checkpoint 2 minimal slice. Lazy-generate (chỉ chạy khi user thật
 * sự bấm dùng, không tự động khi thêm Source — mục 6.1 economics doc); cache
 * theo (sourceId, recipeHash); rate-limit theo user/ngày; quota theo token
 * thực ước lượng, không theo lượt.
 *
 * Route POST nên enqueue nhẹ (ai-integration-plan.md mục 4): trả 202 ngay
 * với status PENDING, xử lý trong cùng process (không cần queue engine
 * riêng vì đích deploy là Docker/self-host, không bị áp lực timeout
 * serverless), rồi update — UI poll đơn giản qua GET.
 */

// Đọc lại mỗi lần gọi (không cache ở module scope) để đổi config qua env
// không cần restart process trong dev/test, và để test có thể chỉnh động.
function dailyActivationLimit(): number {
    return Number(process.env.AI_DAILY_ACTIVATION_LIMIT ?? 20);
}
// Ước lượng thô: ~4 ký tự/token. Ngưỡng an toàn cho SHARED_FREE — video quá
// dài bị từ chối tạo bản mặc định miễn phí (mục 6.3), bắt buộc BYOK/trả phí.
function sharedFreeMaxTranscriptChars(): number {
    return Number(process.env.AI_SHARED_FREE_MAX_TRANSCRIPT_CHARS ?? 60_000);
}

export interface GenerateRequest {
    sourceId: bigint;
    recipeType: RecipeType;
    userId: bigint;
    /** BYOK key của chính user, nếu có. Không có nghĩa là dùng SHARED_FREE. */
    byokApiKey?: string;
}

export interface GenerateResult {
    generation: AIGenerationRecord;
    /** true nếu vừa serve từ cache có sẵn (không tốn gọi LLM mới). */
    servedFromCache: boolean;
}

export class AIGenerationService {
    constructor(
        private prisma: PrismaClient,
        private repo: AIGenerationRepository,
        private transcriptProvider: TranscriptProvider,
        private llmProvider: LLMProvider,
    ) { }

    async generate(req: GenerateRequest): Promise<GenerateResult> {
        const source = await this.prisma.sources.findUnique({ where: { id: req.sourceId } });
        if (!source) {
            throw new Error('SOURCE_NOT_FOUND');
        }

        // Slice tối thiểu Checkpoint 2 chỉ dùng recipe mặc định — chưa có UI
        // tuỳ biến tham số/segment (đó là phạm vi WP2.3/Checkpoint 3 BYOK
        // custom). Vì vậy mọi request ở đây đều isDefaultRecipe = true.
        const params = defaultParamsFor(req.recipeType);
        const isDefaultRecipe = AIGenerationPolicy.isDefaultRecipe(params, null, params);
        const recipeHash = RecipeHash.compute({
            type: req.recipeType,
            params,
            segmentRange: null,
            modelVersion: defaultModel(),
        });

        const hasByokKey = Boolean(req.byokApiKey?.trim());
        const defaultCache = isDefaultRecipe ? await this.repo.findDefaultCache(req.sourceId, recipeHash) : null;
        const sharedByokMatch = !isDefaultRecipe
            ? await this.repo.findSharedByokMatch(req.sourceId, recipeHash)
            : null;

        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey,
            isDefaultRecipe,
            hasDefaultCache: defaultCache !== null,
            hasSharedByokMatch: sharedByokMatch !== null,
        });

        if (decision.action === 'USE_CACHE') {
            const cached = decision.keySource === 'SHARED_FREE' ? defaultCache : sharedByokMatch;
            // decideRouting only returns USE_CACHE when the matching lookup
            // above found something, so this is unreachable in practice —
            // narrows the type for TS rather than masking a real bug.
            if (!cached) throw new Error('AI_GENERATION_CACHE_INCONSISTENT');
            return { generation: cached, servedFromCache: true };
        }

        if (decision.action === 'CHOICE_REQUIRED') {
            throw new Error('AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID');
        }

        // decision.action === 'GENERATE' from here — SHARED_FREE or BYOK.
        if (decision.keySource === 'SHARED_FREE') {
            const activationsToday = await this.repo.countActivationsToday(req.userId);
            AIGenerationPolicy.enforceDailyActivationLimit(activationsToday, dailyActivationLimit());
        }

        const transcript = await this.ensureTranscript(source.id, source.url);

        if (decision.keySource === 'SHARED_FREE') {
            AIGenerationPolicy.enforceSharedFreeTokenBudget(transcript.length, sharedFreeMaxTranscriptChars());
        }

        const visibility = AIGenerationPolicy.resolveVisibility(decision.keySource, false);
        const record = await this.repo.create({
            sourceId: req.sourceId,
            recipeHash,
            recipeType: req.recipeType,
            isDefaultRecipe,
            keySource: decision.keySource,
            generatedByUserId: req.userId,
            visibility,
            modelVersion: defaultModel(),
        });

        // Enqueue nhẹ: record đã lưu ở trạng thái PENDING (giá trị mặc định
        // của cột status), trả về ngay cho route trả 202. Xử lý tiếp trong
        // cùng process — không await ở đây trong route thật, nhưng service
        // này expose generate() đồng bộ để đơn giản hoá test; route gọi
        // .catch() nếu muốn fire-and-forget thật (xem controller/route).
        try {
            // Mục 6.2 — lỗi BYOK không bao giờ tự fallback ngầm sang
            // SHARED_FREE: 2 nhánh key_source dùng cùng code path ở đây vì
            // key nào cũng generate 1 lần rồi lưu, không có logic fallback
            // giữa chúng.
            const apiKey = decision.keySource === 'BYOK' ? req.byokApiKey! : this.sharedFreeApiKey();
            const content = await this.llmProvider.generate({
                apiKey,
                prompt: this.buildPrompt(req.recipeType, transcript),
            });
            await this.repo.markReady(record.id, content);
            return { generation: { ...record, status: 'READY', content }, servedFromCache: false };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'AI_GENERATION_FAILED';
            await this.repo.markFailed(record.id, message);
            throw error;
        }
    }

    /** Mục 6.5 — transcript lưu 1 lần duy nhất ở Source, tái dùng cho mọi generation sau. */
    private async ensureTranscript(sourceId: bigint, sourceUrl: string): Promise<string> {
        const source = await this.prisma.sources.findUnique({ where: { id: sourceId } });
        if (source?.transcript) {
            return source.transcript;
        }
        const videoId = YouTubeOEmbedAdapter.extractVideoId(sourceUrl);
        if (!videoId) {
            throw new Error('TRANSCRIPT_UNSUPPORTED_SOURCE');
        }
        const transcript = await this.transcriptProvider.fetchTranscript(videoId);
        await this.prisma.sources.update({
            where: { id: sourceId },
            data: { transcript, transcript_fetched_at: new Date() },
        });
        return transcript;
    }

    /**
     * WP2.2 (revised) — nhánh SHARED_FREE gọi qua LiteLLM proxy bằng
     * `LITELLM_MASTER_KEY` (key của nền tảng gọi tới chính proxy, không
     * phải key riêng của 1 provider cụ thể — provider nào thật sự được gọi
     * do `litellm/config.yaml` + `AI_DEFAULT_MODEL` quyết định).
     */
    private sharedFreeApiKey(): string {
        const key = process.env.LITELLM_MASTER_KEY;
        if (!key) {
            throw new Error('SHARED_FREE_NOT_CONFIGURED');
        }
        return key;
    }

    private buildPrompt(recipeType: RecipeType, transcript: string): string {
        if (recipeType === 'summary') {
            return `Tóm tắt nội dung video sau bằng tiếng Việt, độ dài chuẩn (5-8 đoạn), rõ ràng, dễ hiểu:\n\n${transcript}`;
        }
        return `Tạo đúng 10 câu hỏi trắc nghiệm (4 đáp án, 1 đáp án đúng) độ khó trung bình bằng tiếng Việt dựa trên nội dung video sau, trả về dạng JSON array:\n\n${transcript}`;
    }
}
