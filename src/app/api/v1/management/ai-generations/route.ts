import { NextRequest, NextResponse } from 'next/server';
import { AIGenerationController } from '@/modules/ai-generation/controllers/AIGenerationController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * 2026-09-05 — nguồn cho trang "/my-ai-shares": liệt kê các bản AI (quiz/tóm
 * tắt) mà chính user này đã tạo bằng BYOK và đang để SHARED, kèm số lần được
 * dùng lại (cache hit) — điểm chạm quản lý còn thiếu khi feature "share BYOK"
 * ra mắt (chỉ có checkbox lúc generate, không có nơi nào xem/thu hồi lại).
 */
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        const controller = new AIGenerationController();
        const items = await controller.listMySharedGenerations(userId);

        return NextResponse.json({
            items: items.map((item) => ({
                id: item.id.toString(),
                recipeType: item.recipeType,
                createdAt: item.createdAt.toISOString(),
                reuseCount: item.reuseCount,
                sourceId: item.sourceId.toString(),
                sourceTitle: item.sourceTitle,
                sourceUrl: item.sourceUrl,
            })),
        });
    } catch (error) {
        console.error('List shared AI generations error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
