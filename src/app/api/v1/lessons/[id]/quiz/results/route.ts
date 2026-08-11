import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '@/modules/course-management/controllers/QuizController';
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
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
