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

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error getting quiz results:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
