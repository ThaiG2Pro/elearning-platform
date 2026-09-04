import { NextRequest, NextResponse } from 'next/server';
import { AIGenerationController } from '@/modules/ai-generation/controllers/AIGenerationController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

/**
 * Owner-only: thu hồi share (chuyển 1 bản AI BYOK từ SHARED về PRIVATE) —
 * cùng pattern DELETE .../share với management/spaces/[id]/share/route.ts.
 * Sau khi thu hồi, request khác không còn ăn cache bản này nữa
 * (findSharedByokMatch chỉ khớp visibility='SHARED').
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'AI_GENERATION_NOT_FOUND' }, { status: 404 });
        }

        const controller = new AIGenerationController();
        await controller.revokeSharedGeneration(userId, BigInt(params.id));

        return NextResponse.json({ status: 'REVOKED' });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'AI_GENERATION_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message === 'AI_GENERATION_NOT_SHARED') {
            return NextResponse.json({ error: message }, { status: 422 });
        }
        console.error('Revoke shared AI generation error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
