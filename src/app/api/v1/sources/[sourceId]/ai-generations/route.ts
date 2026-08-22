import { NextRequest, NextResponse } from 'next/server';
import { AIGenerationController } from '@/modules/ai-generation/controllers/AIGenerationController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { RecipeType } from '@/modules/ai-generation/domain/Recipes';

const VALID_RECIPE_TYPES: RecipeType[] = ['summary', 'quiz'];

/**
 * WP2.2 — lazy-trigger duy nhất cho AI generation (không auto khi thêm
 * Source — mục 6.1 economics doc).
 *
 * Contract SYNC (hướng a, chốt 2026-08-21): request này await trọn lời gọi
 * LLM và trả 200 với kết quả cuối (READY hoặc cache hit) — không có 202,
 * không có polling. Handler GET cũ (poll PENDING → READY) đã xoá vì không
 * client nào gọi và POST chưa bao giờ thật sự fire-and-forget.
 *
 * Hướng (b) để dành sau này — async thật: POST trả 202 + PENDING, thêm lại
 * GET poll theo (sourceId, recipeHash) tới READY/FAILED. Chi tiết điều kiện
 * và yêu cầu kèm theo (job queue / PENDING-timeout) xem doc comment đầu
 * `AIGenerationService.ts`.
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

        const body: {
            type?: string;
            params?: Record<string, unknown>;
            segmentRange?: { startSec: number; endSec: number };
            byokApiKey?: string;
            byokBaseUrl?: string;
            byokModel?: string;
            requestedVisibility?: 'PRIVATE' | 'SHARED';
            paymentMethod?: 'CREDITS';
            force?: boolean;
        } = await request.json();
        if (!body.type || !VALID_RECIPE_TYPES.includes(body.type as RecipeType)) {
            return NextResponse.json({ error: 'INVALID_RECIPE_TYPE' }, { status: 400 });
        }
        if (
            body.segmentRange &&
            (typeof body.segmentRange.startSec !== 'number' ||
                typeof body.segmentRange.endSec !== 'number' ||
                body.segmentRange.startSec >= body.segmentRange.endSec)
        ) {
            return NextResponse.json({ error: 'INVALID_SEGMENT_RANGE' }, { status: 400 });
        }

        const controller = new AIGenerationController();
        const result = await controller.generate({
            sourceId: BigInt(params.sourceId),
            recipeType: body.type as RecipeType,
            userId,
            params: body.params,
            segmentRange: body.segmentRange ?? null,
            byokApiKey: body.byokApiKey,
            byokBaseUrl: body.byokBaseUrl,
            byokModel: body.byokModel,
            requestedVisibility: body.requestedVisibility,
            paymentMethod: body.paymentMethod,
            force: body.force === true,
        });

        // Luôn 200: kết quả đã hoàn tất tại thời điểm trả về (contract sync).
        // 202 cũ là tàn dư của thiết kế async chưa từng chạy — sai ngữ nghĩa.
        return NextResponse.json({
            id: result.generation.id.toString(),
            status: result.generation.status,
            keySource: result.generation.keySource,
            content: result.generation.content,
            servedFromCache: result.servedFromCache,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'SOURCE_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        // Dedup: đã có 1 request khác đang generate đúng bản này — 409
        // Conflict (xung đột với tiến trình đang chạy, không phải lỗi input).
        if (message === 'AI_GENERATION_IN_PROGRESS') {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        if (
            message === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID' ||
            message === 'AI_DAILY_RATE_LIMIT_EXCEEDED' ||
            message === 'SOURCE_TOO_LONG_FOR_SHARED_FREE' ||
            message === 'TRANSCRIPT_UNSUPPORTED_SOURCE' ||
            message === 'SHARED_FREE_NOT_CONFIGURED' ||
            message === 'BYOK_CONFIG_INCOMPLETE' ||
            message === 'BILLING_NOT_CONFIGURED'
        ) {
            return NextResponse.json({ error: message }, { status: 422 });
        }
        // WP4.1 — không đủ credit: 402 Payment Required khớp ngữ nghĩa hơn
        // 422 (lỗi input) hoặc 403 (không phải vấn đề quyền truy cập).
        if (message === 'AI_INSUFFICIENT_CREDITS') {
            return NextResponse.json({ error: message }, { status: 402 });
        }
        console.error('AI generation error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
