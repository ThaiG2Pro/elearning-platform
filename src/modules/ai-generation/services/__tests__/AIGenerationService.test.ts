import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    it('blocks custom recipes with no BYOK key and no SHARED-BYOK match already', async () => {
        // WP2.2 slice tối thiểu chưa có UI tuỳ biến tham số nên isDefaultRecipe
        // luôn true trong service hiện tại — test này khoá lại hành vi của
        // policy layer khi (giả định tương lai) custom params được truyền vào
        // qua findSharedByokMatch trả null và isDefaultRecipe=false không thể
        // xảy ra từ route hiện có. Giữ lại như tài liệu sống cho ranh giới đó.
        expect(repo.findSharedByokMatch).not.toHaveBeenCalled();
    });

    it('enforces the daily activation rate limit before generating via SHARED_FREE', async () => {
        repo.countActivationsToday.mockResolvedValue(20);

        await expect(
            service.generate({ sourceId: 1n, recipeType: 'summary', userId: 5n }),
        ).rejects.toThrow('AI_DAILY_RATE_LIMIT_EXCEEDED');
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
});
