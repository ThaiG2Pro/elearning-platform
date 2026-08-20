import { PrismaClient } from '@prisma/client';
import { AIGenerationPolicy } from '../domain/AIGenerationPolicy';
import { RecipeHash, SegmentRange } from '../domain/RecipeHash';
import { RecipeType, defaultParamsFor, defaultModel } from '../domain/Recipes';
import { AIGenerationRecord, AIGenerationRepository } from '../repositories/AIGenerationRepository';
import { TranscriptProvider } from './TranscriptProvider';
import { LLMProvider } from './LLMProvider';
import { WebContentProvider } from './WebContentProvider';
import { YouTubeOEmbedAdapter } from '../../../shared/adapters/YouTubeOEmbedAdapter';
import { aiGenerationCreditCost } from '../../billing/domain/CreditLedger';

/** WP4.1 — chỉ 2 method service này cần, tránh phụ thuộc cứng vào CreditRepository thật trong test. */
export interface CreditSpender {
    spendCredits(userId: bigint, amount: number): Promise<number>;
    refundCredits(userId: bigint, amount: number): Promise<number>;
}

/** WP4.2 — chỉ method service này cần, cùng lý do trên. */
export interface AccessTracker {
    touchLastAccessed(sourceId: bigint): Promise<void>;
}

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
    /**
     * WP3.1 — tuỳ biến tham số recipe (độ dài/độ khó/giọng văn...). Không
     * truyền = dùng cấu hình mặc định hệ thống (`defaultParamsFor`). Truyền
     * BẤT KỲ giá trị nào (kể cả trùng y hệt mặc định) vẫn được coi là tuỳ
     * biến ở tầng gọi — ranh giới default/custom thật sự do `params` có mặt
     * hay không quyết định ở route (mục 2 economics doc).
     */
    params?: Record<string, unknown>;
    /** Tuỳ biến đoạn thời gian — có giá trị cũng rời khỏi "mặc định" (mục 2). */
    segmentRange?: SegmentRange | null;
    /**
     * BYOK — endpoint OpenAI-compatible của chính user (provider thật hoặc
     * proxy LiteLLM riêng họ tự chạy) + key + model. Bắt buộc đủ cả 3 khi
     * dùng BYOK (`AIGenerationPolicy.byokConfigStatus`) — không đoán giúp
     * provider/model nào.
     */
    byokApiKey?: string;
    byokBaseUrl?: string;
    byokModel?: string;
    /** Chỉ có ý nghĩa khi routing cuối cùng ra keySource = BYOK (mục 5) — user
     * tự chọn chia sẻ bản tuỳ biến của họ cho người khác tái dùng free. */
    requestedVisibility?: 'PRIVATE' | 'SHARED';
    /**
     * WP4.1 — user chọn "Trả phí để nền tảng tạo giúp" (nửa thứ 2 của nhánh
     * UX #4). Chỉ có tác dụng khi routing lẽ ra rơi vào CHOICE_REQUIRED —
     * không override BYOK/SHARED_FREE (những nhánh rẻ hơn luôn thắng).
     */
    paymentMethod?: 'CREDITS';
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
        // WP3.3 — optional để không phá test/caller hiện có chỉ dùng YouTube;
        // undefined + Source kiểu WEB_ARTICLE => TRANSCRIPT_UNSUPPORTED_SOURCE.
        private webContentProvider?: WebContentProvider,
        // WP4.1 — optional, cùng lý do trên: nếu không wire (test cũ, hoặc
        // billing chưa cấu hình), paymentMethod: 'CREDITS' throw rõ ràng thay
        // vì âm thầm bỏ qua yêu cầu trả phí của user.
        private creditSpender?: CreditSpender,
        // WP4.2 — optional, best-effort (lỗi ở đây không chặn generate chính).
        private accessTracker?: AccessTracker,
    ) { }

    async generate(req: GenerateRequest): Promise<GenerateResult> {
        const source = await this.prisma.sources.findUnique({ where: { id: req.sourceId } });
        if (!source) {
            throw new Error('SOURCE_NOT_FOUND');
        }

        // WP4.2 — "còn ai đang thật sự dùng" (mục 6.4), tách khỏi
        // created_at/updated_at. Best-effort: không throw ra ngoài, generate
        // chính không được phép fail vì lỗi ghi 1 cột phụ trợ.
        if (this.accessTracker) {
            this.accessTracker.touchLastAccessed(source.id).catch((err) => {
                console.error('touchLastAccessed failed (non-fatal):', err);
            });
        }

        // WP3.1 — `req.params` có mặt (kể cả trùng y hệt mặc định) hoặc có
        // segmentRange là rời khỏi "mặc định" (mục 2 economics doc); không
        // truyền gì = dùng đúng cấu hình mặc định hệ thống như Checkpoint 2.
        const defaultParams = defaultParamsFor(req.recipeType);
        const params = req.params ?? defaultParams;
        const segmentRange = req.segmentRange ?? null;
        const isDefaultRecipe = AIGenerationPolicy.isDefaultRecipe(params, segmentRange, defaultParams);
        const recipeHash = RecipeHash.compute({
            type: req.recipeType,
            params,
            segmentRange,
            modelVersion: defaultModel(),
        });

        const byokStatus = AIGenerationPolicy.byokConfigStatus(req.byokApiKey, req.byokBaseUrl, req.byokModel);
        if (byokStatus === 'INCOMPLETE') {
            throw new Error('BYOK_CONFIG_INCOMPLETE');
        }
        const hasByokKey = byokStatus === 'COMPLETE';
        const defaultCache = isDefaultRecipe ? await this.repo.findDefaultCache(req.sourceId, recipeHash) : null;
        const sharedByokMatch = !isDefaultRecipe
            ? await this.repo.findSharedByokMatch(req.sourceId, recipeHash)
            : null;

        // WP4.1 — chỉ có ý nghĩa khi 3 nhánh rẻ hơn ở trên đều không khớp;
        // decideRouting tự đảm bảo thứ tự ưu tiên đó, ở đây chỉ truyền ý
        // định của user xuống.
        if (req.paymentMethod === 'CREDITS' && !this.creditSpender) {
            throw new Error('BILLING_NOT_CONFIGURED');
        }
        const decision = AIGenerationPolicy.decideRouting({
            hasByokKey,
            isDefaultRecipe,
            hasDefaultCache: defaultCache !== null,
            hasSharedByokMatch: sharedByokMatch !== null,
            creditsAuthorized: req.paymentMethod === 'CREDITS',
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

        const transcript = await this.ensureTranscript(source.id, source.url, source.type);

        if (decision.keySource === 'SHARED_FREE') {
            AIGenerationPolicy.enforceSharedFreeTokenBudget(transcript.length, sharedFreeMaxTranscriptChars());
        }

        // WP4.1 — trừ credit TRƯỚC khi gọi LLM (throw AI_INSUFFICIENT_CREDITS
        // nếu không đủ, chưa tốn gì); hoàn lại trong nhánh catch bên dưới nếu
        // LLM call thất bại sau khi đã trừ tiền.
        if (decision.keySource === 'PAID_TIER') {
            await this.creditSpender!.spendCredits(req.userId, aiGenerationCreditCost());
        }

        // WP3.1/mục 5 — user chỉ được tự chọn SHARED khi bản cuối cùng là
        // BYOK; SHARED_FREE/PAID_TIER do policy tự quyết (không đọc
        // requestedVisibility ở 2 nhánh đó, tránh user "xin" SHARED cho 1
        // bản PAID_TIER thông qua route).
        const visibility = AIGenerationPolicy.resolveVisibility(
            decision.keySource,
            decision.keySource === 'BYOK' && req.requestedVisibility === 'SHARED',
        );
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
                // WP3.1 — BYOK gọi thẳng endpoint/model của chính user;
                // SHARED_FREE để undefined, LiteLLMProvider tự dùng proxy +
                // model mặc định của nền tảng.
                baseUrl: decision.keySource === 'BYOK' ? req.byokBaseUrl : undefined,
                model: decision.keySource === 'BYOK' ? req.byokModel : undefined,
                prompt: this.buildPrompt(req.recipeType, transcript, params, segmentRange),
            });
            await this.repo.markReady(record.id, content);
            return { generation: { ...record, status: 'READY', content }, servedFromCache: false };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'AI_GENERATION_FAILED';
            await this.repo.markFailed(record.id, message);
            // WP4.1 — LLM call thất bại sau khi đã trừ credit: hoàn lại ngay,
            // user không trả tiền cho 1 lần generate lỗi.
            if (decision.keySource === 'PAID_TIER') {
                await this.creditSpender!.refundCredits(req.userId, aiGenerationCreditCost());
            }
            throw error;
        }
    }

    /**
     * Mục 6.5 — transcript/nội dung trích xuất lưu 1 lần duy nhất ở Source,
     * tái dùng cho mọi generation sau.
     *
     * WP3.3 — mở rộng ngoài YouTube: `sources.type === 'WEB_ARTICLE'` dùng
     * `webContentProvider` (readability extraction) thay vì
     * `transcriptProvider` (YouTube captions). Cùng 1 cột `transcript` chứa
     * nội dung đã trích xuất bất kể nguồn — tên cột giữ nguyên từ WP2.2 để
     * không phải migrate lại, ý nghĩa đã mở rộng thành "nội dung văn bản để
     * đưa vào prompt LLM", không riêng caption video.
     */
    private async ensureTranscript(sourceId: bigint, sourceUrl: string, sourceType: string): Promise<string> {
        const source = await this.prisma.sources.findUnique({ where: { id: sourceId } });
        if (source?.transcript) {
            return source.transcript;
        }

        let transcript: string;
        if (sourceType === 'WEB_ARTICLE') {
            if (!this.webContentProvider) {
                throw new Error('TRANSCRIPT_UNSUPPORTED_SOURCE');
            }
            transcript = await this.webContentProvider.fetchContent(sourceUrl);
        } else {
            const videoId = YouTubeOEmbedAdapter.extractVideoId(sourceUrl);
            if (!videoId) {
                throw new Error('TRANSCRIPT_UNSUPPORTED_SOURCE');
            }
            transcript = await this.transcriptProvider.fetchTranscript(videoId);
        }

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

    /**
     * WP3.1 — đọc `params`/`segmentRange` tuỳ biến thay vì hard-code chuẩn/10
     * câu/tiếng Việt như Checkpoint 2. `defaultParamsFor` vẫn là fallback khi
     * field cụ thể không có trong `params` (params tuỳ biến có thể chỉ đổi 1
     * trong nhiều field).
     *
     * Ghi chú giới hạn: `transcript`/nội dung web không kèm mốc thời gian
     * (TranscriptProvider trả text thuần đã ghép — xem docstring interface),
     * nên segmentRange chỉ truyền xuống LLM như 1 chỉ dẫn ("chỉ tập trung
     * đoạn X-Y giây"), không cắt transcript chính xác theo giây — đủ dùng cho
     * MVP Checkpoint 3, không phải cắt transcript có timestamp thật.
     */
    private buildPrompt(
        recipeType: RecipeType,
        transcript: string,
        params: Record<string, unknown>,
        segmentRange: SegmentRange | null,
    ): string {
        const language = (params.language as string) ?? 'vi';
        const languageInstruction = language === 'en' ? 'in English' : 'bằng tiếng Việt';
        const segmentInstruction = segmentRange
            ? language === 'en'
                ? ` Focus only on the part of the content between ${segmentRange.startSec}s and ${segmentRange.endSec}s (best-effort, no exact timestamps available).`
                : ` Chỉ tập trung vào phần nội dung từ khoảng giây ${segmentRange.startSec} đến ${segmentRange.endSec} (chỉ mang tính tương đối, nội dung không kèm mốc thời gian chính xác).`
            : '';

        if (recipeType === 'summary') {
            const length = (params.length as string) ?? 'standard';
            const lengthInstruction = { short: '2-3 đoạn', standard: '5-8 đoạn', long: '10-15 đoạn' }[length] ?? '5-8 đoạn';
            return `Tóm tắt nội dung sau ${languageInstruction}, độ dài ${lengthInstruction}, rõ ràng, dễ hiểu.${segmentInstruction}\n\n${transcript}`;
        }

        const questionCount = Number(params.questionCount) || 10;
        const difficulty = (params.difficulty as string) ?? 'medium';
        // Schema field names cố định (content/options/correctAnswer) khớp
        // đúng `ParsedQuestionDto` phía backend (xem QuizService — cùng
        // shape với luồng Excel upload) — để client (parseAIQuizContent,
        // src/lib/aiGeneration.ts) có thể parse ra quiz thật và cho phép
        // "AI tạo quiz" trong editor lưu thẳng thành 1 bài quiz mới, thay vì
        // chỉ hiển thị văn bản thô như trước. Không có schema field cố định
        // trước đây — model tự chọn shape tuỳ ý, không parse được.
        return `Tạo đúng ${questionCount} câu hỏi trắc nghiệm (2-4 đáp án, 1 đáp án đúng) độ khó ${difficulty} ${languageInstruction} dựa trên nội dung sau. Trả về DUY NHẤT 1 JSON array hợp lệ, không kèm giải thích hay markdown, đúng schema: [{"content": string, "options": string[], "correctAnswer": string (phải là text của 1 phần tử trong options)}].${segmentInstruction}\n\n${transcript}`;
    }
}
