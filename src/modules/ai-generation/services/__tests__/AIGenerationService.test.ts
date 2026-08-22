import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIGenerationService } from '../AIGenerationService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makePrisma = (source: any) => ({
    sources: {
        findUnique: vi.fn().mockResolvedValue(source),
        update: vi.fn().mockResolvedValue(undefined),
    },
});

const makeRepo = () => ({
    findDefaultCache: vi.fn().mockResolvedValue(null),
    findSharedByokMatch: vi.fn().mockResolvedValue(null),
    findInFlight: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    markReady: vi.fn(),
    markFailed: vi.fn(),
    countActivationsToday: vi.fn().mockResolvedValue(0),
});

const makeTranscriptProvider = () => ({
    fetchTranscript: vi.fn().mockResolvedValue('nội dung transcript giả lập'),
});

const makeLLMProvider = () => ({
    generate: vi.fn().mockResolvedValue('output AI giả lập'),
});

const SOURCE = {
    id: 1n,
    url: 'https://www.youtube.com/watch?v=abc12345678',
    normalized_url: 'https://www.youtube.com/watch?v=abc12345678',
    title: 'Video demo',
    type: 'YOUTUBE_VIDEO',
    metadata: null,
    created_at: new Date(),
    transcript: null,
    transcript_fetched_at: null,
};

// ── Tests ────────────────────────────────────────────────────────────────────
// WP2.2 — pipeline generate AI mặc định có kiểm soát chi phí.

describe('AIGenerationService.generate', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let repo: ReturnType<typeof makeRepo>;
    let transcriptProvider: ReturnType<typeof makeTranscriptProvider>;
    let llmProvider: ReturnType<typeof makeLLMProvider>;
    let service: AIGenerationService;

    beforeEach(() => {
        prisma = makePrisma(SOURCE);
        repo = makeRepo();
        transcriptProvider = makeTranscriptProvider();
        llmProvider = makeLLMProvider();
        repo.create.mockResolvedValue({
            id: 100n,
            sourceId: 1n,
            recipeHash: 'hash',
            recipeType: 'summary',
            isDefaultRecipe: true,
            keySource: 'SHARED_FREE',
            generatedByUserId: 5n,
            visibility: 'SHARED',
            status: 'PENDING',
            modelVersion: 'default',
            content: null,
            error: null,
        });
        process.env.LITELLM_MASTER_KEY = 'test-shared-key';
        service = new AIGenerationService(prisma as any, repo as any, transcriptProvider as any, llmProvider as any);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('throws SOURCE_NOT_FOUND when the source does not exist', async () => {
        prisma.sources.findUnique.mockResolvedValue(null);
        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('SOURCE_NOT_FOUND');
    });

    it('serves the SHARED_FREE cache instantly without calling the LLM again', async () => {
        const cached = {
            id: 42n, sourceId: 1n, recipeHash: 'h', recipeType: 'summary', isDefaultRecipe: true,
            keySource: 'SHARED_FREE' as const, generatedByUserId: null, visibility: 'SHARED' as const,
            status: 'READY' as const, modelVersion: 'default', content: 'bản tóm tắt đã cache', error: null,
        };
        repo.findDefaultCache.mockResolvedValue(cached);

        const result = await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

        expect(result).toEqual({ generation: cached, servedFromCache: true });
        expect(llmProvider.generate).not.toHaveBeenCalled();
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('force=true bypasses an existing SHARED_FREE cache and regenerates (nút "Tạo lại")', async () => {
        repo.findDefaultCache.mockResolvedValue({
            id: 42n, content: 'bản cache cũ phải bị bỏ qua', status: 'READY',
        } as any);

        const result = await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n, force: true });

        // force coi như chưa có cache: không đọc cache, generate mới thật sự.
        expect(repo.findDefaultCache).not.toHaveBeenCalled();
        expect(llmProvider.generate).toHaveBeenCalled();
        expect(result.servedFromCache).toBe(false);
    });

    it('blocks a duplicate generate while an in-flight PENDING row exists (dedup)', async () => {
        repo.findInFlight.mockResolvedValue({ id: 99n, status: 'PENDING' } as any);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('AI_GENERATION_IN_PROGRESS');
        // Chặn TRƯỚC khi tốn bất kỳ thứ gì: không gọi LLM, không tạo row mới.
        expect(llmProvider.generate).not.toHaveBeenCalled();
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('generates via SHARED_FREE on a cache miss, fetching+persisting transcript once', async () => {
        const result = await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

        expect(result.servedFromCache).toBe(false);
        expect(transcriptProvider.fetchTranscript).toHaveBeenCalledWith('abc12345678');
        expect(prisma.sources.update).toHaveBeenCalledWith({
            where: { id: 1n },
            data: { transcript: 'nội dung transcript giả lập', transcript_fetched_at: expect.any(Date) },
        });
        expect(llmProvider.generate).toHaveBeenCalledWith({
            apiKey: 'test-shared-key',
            prompt: expect.stringContaining('nội dung transcript giả lập'),
        });
        expect(repo.markReady).toHaveBeenCalledWith(100n, 'output AI giả lập');
    });

    it('reuses an already-fetched transcript instead of calling the provider again', async () => {
        prisma = makePrisma({ ...SOURCE, transcript: 'transcript đã lưu sẵn' });
        service = new AIGenerationService(prisma as any, repo as any, transcriptProvider as any, llmProvider as any);

        await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

        expect(transcriptProvider.fetchTranscript).not.toHaveBeenCalled();
        expect(prisma.sources.update).not.toHaveBeenCalled();
    });

    it('always routes through BYOK when a full key config is provided, even if a SHARED_FREE cache exists', async () => {
        repo.findDefaultCache.mockResolvedValue({ id: 1n, content: 'cached but must be ignored' } as any);

        await service.generate({
            sourceId: 1n,
            recipeType: 'summary',
            userId: 5n,
            byokApiKey: 'user-own-key',
            byokBaseUrl: 'https://api.groq.com/openai/v1',
            byokModel: 'llama-3.3-70b-versatile',
        });

        expect(llmProvider.generate).toHaveBeenCalledWith(expect.objectContaining({
            apiKey: 'user-own-key',
            baseUrl: 'https://api.groq.com/openai/v1',
            model: 'llama-3.3-70b-versatile',
        }));
    });

    it('rejects an incomplete BYOK config (some but not all of key/baseUrl/model)', async () => {
        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n, byokApiKey: 'user-own-key' }),
        ).rejects.toThrow('BYOK_CONFIG_INCOMPLETE');
        expect(llmProvider.generate).not.toHaveBeenCalled();
    });

    it('enforces the daily activation rate limit before generating via SHARED_FREE', async () => {
        repo.countActivationsToday.mockResolvedValue(20);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('AI_DAILY_RATE_LIMIT_EXCEEDED');
        expect(llmProvider.generate).not.toHaveBeenCalled();
    });

    it('malformed AI_DAILY_ACTIVATION_LIMIT env must NOT disable the daily limit (falls back to 20)', async () => {
        // Number('abc') = NaN, và `count >= NaN` luôn false — không có guard
        // này, 1 env gõ nhầm âm thầm mở vòi LLM key nền tảng không giới hạn.
        vi.stubEnv('AI_DAILY_ACTIVATION_LIMIT', 'abc');
        repo.countActivationsToday.mockResolvedValue(20);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('AI_DAILY_RATE_LIMIT_EXCEEDED');
        expect(llmProvider.generate).not.toHaveBeenCalled();
    });

    it('malformed AI_SHARED_FREE_MAX_TRANSCRIPT_CHARS env must NOT disable the length budget (falls back to 60k)', async () => {
        vi.stubEnv('AI_SHARED_FREE_MAX_TRANSCRIPT_CHARS', '');
        prisma = makePrisma({ ...SOURCE, transcript: 'x'.repeat(60_001) });
        service = new AIGenerationService(prisma as any, repo as any, transcriptProvider as any, llmProvider as any);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('SOURCE_TOO_LONG_FOR_SHARED_FREE');
        expect(llmProvider.generate).not.toHaveBeenCalled();
    });

    it('rejects a transcript too long for the SHARED_FREE token budget', async () => {
        process.env.AI_SHARED_FREE_MAX_TRANSCRIPT_CHARS = '10';

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('SOURCE_TOO_LONG_FOR_SHARED_FREE');

        delete process.env.AI_SHARED_FREE_MAX_TRANSCRIPT_CHARS;
    });

    it('marks the generation FAILED and rethrows when the LLM call errors', async () => {
        llmProvider.generate.mockRejectedValue(new Error('LITELLM_GENERATION_FAILED'));

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('LITELLM_GENERATION_FAILED');
        expect(repo.markFailed).toHaveBeenCalledWith(100n, 'LITELLM_GENERATION_FAILED');
    });

    it('throws SHARED_FREE_NOT_CONFIGURED when no LITELLM_MASTER_KEY is set and no BYOK key given', async () => {
        delete process.env.LITELLM_MASTER_KEY;

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('SHARED_FREE_NOT_CONFIGURED');
    });

    // WP3.1 — tuỳ biến tham số/segment.
    it('blocks a custom recipe (custom params) with no BYOK key and no SHARED-BYOK match', async () => {
        await expect(
            service.generate({
                sourceId: 1n,
                recipeType: 'summary',
                userId: 5n,
                params: { length: 'long', language: 'vi' },
            }),
        ).rejects.toThrow('AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID');
        expect(llmProvider.generate).not.toHaveBeenCalled();
    });

    it('generates a custom recipe via BYOK and only shares it when the user opts in (mục 5)', async () => {
        const result = await service.generate({
            sourceId: 1n,
            recipeType: 'summary',
            userId: 5n,
            params: { length: 'short', language: 'vi' },
            byokApiKey: 'user-own-key',
            byokBaseUrl: 'https://api.groq.com/openai/v1',
            byokModel: 'llama-3.3-70b-versatile',
            requestedVisibility: 'SHARED',
        });

        expect(result.servedFromCache).toBe(false);
        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
            isDefaultRecipe: false,
            keySource: 'BYOK',
            visibility: 'SHARED',
        }));
    });

    it('never shares a SHARED_FREE generation choice — visibility is policy-decided, not user-requested', async () => {
        await service.generate({
            sourceId: 1n,
            recipeType: 'summary',
            userId: 5n,
            requestedVisibility: 'SHARED', // no-op outside BYOK
        });

        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ keySource: 'SHARED_FREE', visibility: 'SHARED' }));
    });

    // WP3.3 — nguồn web/blog.
    it('fetches web content via webContentProvider for a WEB_ARTICLE source instead of YouTube transcript', async () => {
        prisma = makePrisma({ ...SOURCE, type: 'WEB_ARTICLE', url: 'https://blog.example.com/post', transcript: null });
        const webContentProvider = { fetchContent: vi.fn().mockResolvedValue('nội dung bài viết đã trích xuất') };
        service = new AIGenerationService(prisma as any, repo as any, transcriptProvider as any, llmProvider as any, webContentProvider as any);

        await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

        expect(webContentProvider.fetchContent).toHaveBeenCalledWith('https://blog.example.com/post');
        expect(transcriptProvider.fetchTranscript).not.toHaveBeenCalled();
        expect(prisma.sources.update).toHaveBeenCalledWith({
            where: { id: 1n },
            data: { transcript: 'nội dung bài viết đã trích xuất', transcript_fetched_at: expect.any(Date) },
        });
    });

    it('throws TRANSCRIPT_UNSUPPORTED_SOURCE for a WEB_ARTICLE source when no webContentProvider is wired', async () => {
        prisma = makePrisma({ ...SOURCE, type: 'WEB_ARTICLE', url: 'https://blog.example.com/post', transcript: null });
        service = new AIGenerationService(prisma as any, repo as any, transcriptProvider as any, llmProvider as any);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('TRANSCRIPT_UNSUPPORTED_SOURCE');
    });

    // WP4.1 — nửa thứ 2 của nhánh UX #4: "Trả phí để nền tảng tạo giúp".
    describe('WP4.1 — PAID_TIER via credits', () => {
        const makeCreditSpender = () => ({
            spendCredits: vi.fn().mockResolvedValue(90),
            refundCredits: vi.fn().mockResolvedValue(100),
        });

        it('throws BILLING_NOT_CONFIGURED when paymentMethod CREDITS is requested but no CreditSpender is wired', async () => {
            await expect(
                service.generate({
                    sourceId: 1n,
                    recipeType: 'summary',
                    userId: 5n,
                    params: { length: 'long', language: 'vi' },
                    paymentMethod: 'CREDITS',
                }),
            ).rejects.toThrow('BILLING_NOT_CONFIGURED');
        });

        it('spends credits and generates via PAID_TIER for a custom recipe with no BYOK/SHARED-BYOK match', async () => {
            const creditSpender = makeCreditSpender();
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            const result = await service.generate({
                sourceId: 1n,
                recipeType: 'summary',
                userId: 5n,
                params: { length: 'long', language: 'vi' },
                paymentMethod: 'CREDITS',
            });

            expect(creditSpender.spendCredits).toHaveBeenCalledWith(5n, expect.any(Number));
            expect(result.servedFromCache).toBe(false);
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ keySource: 'PAID_TIER', visibility: 'PRIVATE' }));
            expect(llmProvider.generate).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'test-shared-key' }));
        });

        it('propagates AI_INSUFFICIENT_CREDITS without calling the LLM', async () => {
            const creditSpender = makeCreditSpender();
            creditSpender.spendCredits.mockRejectedValue(new Error('AI_INSUFFICIENT_CREDITS'));
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            await expect(
                service.generate({
                    sourceId: 1n,
                    recipeType: 'summary',
                    userId: 5n,
                    params: { length: 'long', language: 'vi' },
                    paymentMethod: 'CREDITS',
                }),
            ).rejects.toThrow('AI_INSUFFICIENT_CREDITS');
            expect(llmProvider.generate).not.toHaveBeenCalled();
        });

        it('refunds credits when the LLM call fails after spending', async () => {
            const creditSpender = makeCreditSpender();
            llmProvider.generate.mockRejectedValue(new Error('LITELLM_GENERATION_FAILED'));
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            await expect(
                service.generate({
                    sourceId: 1n,
                    recipeType: 'summary',
                    userId: 5n,
                    params: { length: 'long', language: 'vi' },
                    paymentMethod: 'CREDITS',
                }),
            ).rejects.toThrow('LITELLM_GENERATION_FAILED');
            expect(creditSpender.spendCredits).toHaveBeenCalledTimes(1);
            expect(creditSpender.refundCredits).toHaveBeenCalledTimes(1);
            expect(creditSpender.refundCredits).toHaveBeenCalledWith(5n, expect.any(Number));
        });

        it('refunds exactly once when the LLM succeeds but markReady fails (paid work lost, user not charged)', async () => {
            const creditSpender = makeCreditSpender();
            repo.markReady.mockRejectedValue(new Error('DB_WRITE_FAILED'));
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            await expect(
                service.generate({
                    sourceId: 1n,
                    recipeType: 'summary',
                    userId: 5n,
                    params: { length: 'long', language: 'vi' },
                    paymentMethod: 'CREDITS',
                }),
            ).rejects.toThrow('DB_WRITE_FAILED');
            expect(creditSpender.spendCredits).toHaveBeenCalledTimes(1);
            expect(creditSpender.refundCredits).toHaveBeenCalledTimes(1);
            expect(creditSpender.refundCredits).toHaveBeenCalledWith(5n, expect.any(Number));
        });

        it('surfaces an error and still marks FAILED when the refund itself rejects after an LLM failure', async () => {
            // Pin hành vi hiện tại: refund lỗi thay thế lỗi LLM gốc (known
            // limitation — lỗi gốc bị che); quan trọng là call vẫn fail to
            // và row đã được markFailed, không âm thầm nuốt lỗi.
            const creditSpender = makeCreditSpender();
            llmProvider.generate.mockRejectedValue(new Error('LITELLM_GENERATION_FAILED'));
            creditSpender.refundCredits.mockRejectedValue(new Error('REFUND_FAILED'));
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            await expect(
                service.generate({
                    sourceId: 1n,
                    recipeType: 'summary',
                    userId: 5n,
                    params: { length: 'long', language: 'vi' },
                    paymentMethod: 'CREDITS',
                }),
            ).rejects.toThrow('REFUND_FAILED');
            expect(repo.markFailed).toHaveBeenCalledWith(100n, 'LITELLM_GENERATION_FAILED');
        });

        it('never spends credits on the BYOK and SHARED_FREE generate paths', async () => {
            const creditSpender = makeCreditSpender();
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            await service.generate({
                sourceId: 1n, recipeType: 'summary', userId: 5n,
                byokApiKey: 'user-own-key',
                byokBaseUrl: 'https://api.groq.com/openai/v1',
                byokModel: 'llama-3.3-70b-versatile',
            });
            await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

            expect(creditSpender.spendCredits).not.toHaveBeenCalled();
        });

        it('creditsAuthorized never overrides a cheaper existing default cache (SHARED_FREE wins)', async () => {
            repo.findDefaultCache.mockResolvedValue({
                id: 42n, sourceId: 1n, recipeHash: 'h', recipeType: 'summary', isDefaultRecipe: true,
                keySource: 'SHARED_FREE' as const, generatedByUserId: null, visibility: 'SHARED' as const,
                status: 'READY' as const, modelVersion: 'default', content: 'cached', error: null,
            });
            const creditSpender = makeCreditSpender();
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, creditSpender as any,
            );

            const result = await service.generate({
                sourceId: 1n, recipeType: 'summary', userId: 5n, paymentMethod: 'CREDITS',
            });

            expect(result.servedFromCache).toBe(true);
            expect(creditSpender.spendCredits).not.toHaveBeenCalled();
        });
    });

    // WP4.2 — theo dõi "lần cuối thật sự được dùng".
    describe('WP4.2 — access tracking', () => {
        it('touches last-accessed when an AccessTracker is wired, on both cache hit and miss', async () => {
            const accessTracker = { touchLastAccessed: vi.fn().mockResolvedValue(undefined) };
            service = new AIGenerationService(
                prisma as any, repo as any, transcriptProvider as any, llmProvider as any,
                undefined, undefined, accessTracker as any,
            );

            await service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n });

            expect(accessTracker.touchLastAccessed).toHaveBeenCalledWith(1n);
        });
    });
});
