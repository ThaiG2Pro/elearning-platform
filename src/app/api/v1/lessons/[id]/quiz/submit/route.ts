import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '@/modules/space-management/controllers/QuizController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { SubmitQuizDto } from '@/modules/space-management/dtos/QuizResultDto';
import { parseIdParam } from '@/shared/http/params';
import { safeErrorMessage } from '@/shared/http/routeErrors';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

        const body: SubmitQuizDto = await request.json();

        const controller = new QuizController();
        const result = await controller.submitQuiz(userId, lessonId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Submit quiz error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : message === 'LESSON_NOT_FOUND' ? 404 : (message === 'QUIZ_EXPIRED' || message === 'INVALID_SUBMISSION' || message === 'Quiz not started') ? 400 : 500;
        return NextResponse.json({ error: safeErrorMessage(message, status) }, { status });
    }
}
