import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '@/modules/space-management/controllers/QuizController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }
        const controller = new QuizController();
        const results = await controller.getQuizResults(userId, lessonId);

        // QuizAttemptDto.id is a raw bigint (progress.id) — same
        // BigInt-serialization crash as the other two routes fixed
        // alongside this one; this endpoint has no frontend caller yet but
        // would 500 on its very first real call once one exists.
        return NextResponse.json(results.map(r => ({ ...r, id: r.id.toString() })));
    } catch (error) {
        console.error('Error getting quiz results:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: safeErrorMessage(message, 500) }, { status: 500 });
    }
}
