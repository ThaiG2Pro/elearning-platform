import { NextRequest, NextResponse } from 'next/server';
import { AIGenerationController } from '@/modules/ai-generation/controllers/AIGenerationController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { RecipeType, defaultParamsFor, MODEL_VERSION } from '@/modules/ai-generation/domain/Recipes';
import { RecipeHash } from '@/modules/ai-generation/domain/RecipeHash';
import { prisma } from '@/shared/config/database';

const VALID_RECIPE_TYPES: RecipeType[] = ['summary', 'quiz'];

/**
 * GET — đọc cache mặc định đã có, không trigger generate mới (UI poll trạng
 * thái PENDING → READY, hoặc kiểm tra "đã có bản chưa" trước khi hiện nút
 * generate).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { sourceId: string } },
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        if (!params.sourceId || isNaN(Number(params.sourceId))) {
            return NextResponse.json({ error: 'SOURCE_NOT_FOUND' }, { status: 404 });
        }

        const type = request.nextUrl.searchParams.get('type');
        if (!type || !VALID_RECIPE_TYPES.includes(type as RecipeType)) {
            return NextResponse.json({ error: 'INVALID_RECIPE_TYPE' }, { status: 400 });
        }

        const params_ = defaultParamsFor(type as RecipeType);
        const recipeHash = RecipeHash.compute({
            type,
            params: params_,
            segmentRange: null,
            modelVersion: MODEL_VERSION,
        });

        const generation = await prisma.ai_generations.findFirst({
            where: {
                source_id: BigInt(params.sourceId),
                recipe_hash: recipeHash,
                key_source: 'SHARED_FREE',
            },
        });

        if (!generation) {
            return NextResponse.json({ generation: null });
        }

        return NextResponse.json({
            generation: {
                id: generation.id.toString(),
                status: generation.status,
                content: generation.content,
            },
        });
    } catch (error) {
        console.error('Get AI generation error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}

/**
 * WP2.2 — lazy-trigger duy nhất cho AI generation (không auto khi thêm
 * Source — mục 6.1 economics doc). Route enqueue nhẹ: `AIGenerationService`
 * đã lưu bản PENDING trước khi gọi LLM, nên ngay cả khi request này timeout/
 * bị huỷ giữa chừng, GET sau vẫn đọc lại được trạng thái thật từ DB.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { sourceId: string } },
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        if (!params.sourceId || isNaN(Number(params.sourceId))) {
            return NextResponse.json({ error: 'SOURCE_NOT_FOUND' }, { status: 404 });
        }

        const body: { type?: string; byokApiKey?: string } = await request.json();
        if (!body.type || !VALID_RECIPE_TYPES.includes(body.type as RecipeType)) {
            return NextResponse.json({ error: 'INVALID_RECIPE_TYPE' }, { status: 400 });
        }

        const controller = new AIGenerationController();
        const result = await controller.generate({
            sourceId: BigInt(params.sourceId),
            recipeType: body.type as RecipeType,
            userId,
            byokApiKey: body.byokApiKey,
        });

        return NextResponse.json({
            id: result.generation.id.toString(),
            status: result.generation.status,
            keySource: result.generation.keySource,
            content: result.generation.content,
            servedFromCache: result.servedFromCache,
        }, { status: result.servedFromCache ? 200 : 202 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'SOURCE_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (
            message === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID' ||
            message === 'AI_DAILY_RATE_LIMIT_EXCEEDED' ||
            message === 'SOURCE_TOO_LONG_FOR_SHARED_FREE' ||
            message === 'TRANSCRIPT_UNSUPPORTED_SOURCE' ||
            message === 'SHARED_FREE_NOT_CONFIGURED'
        ) {
            return NextResponse.json({ error: message }, { status: 422 });
        }
        console.error('AI generation error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
