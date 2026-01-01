import { NextRequest, NextResponse } from 'next/server';
import { LearnController } from '@/modules/course-management/controllers/LearnController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = BigInt(params.id);
        const controller = new LearnController();
        const progress = await controller.getProgress(userId, lessonId);

        if (!progress) {
            return NextResponse.json({
                lessonId: params.id,
                currentPosition: 0,
                isCompleted: false,
                lastAccessedAt: new Date().toISOString()
            }, { status: 200 });
        }

        return NextResponse.json({
            lessonId: params.id,
            currentPosition: progress.currentPosition,
            isCompleted: progress.isCompleted,
            lastAccessedAt: progress.lastAccessedAt
        }, { status: 200 });
    } catch (error) {
        console.error('Error getting progress:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { position, duration, isPreview = false } = await request.json();

        if (typeof position !== 'number' || typeof duration !== 'number') {
            return NextResponse.json({ error: 'Invalid position or duration' }, { status: 400 });
        }

        const lessonId = BigInt(params.id);
        const controller = new LearnController();
        const result = await controller.trackVideoProgress(userId, lessonId, position, duration, isPreview);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error tracking video progress:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
