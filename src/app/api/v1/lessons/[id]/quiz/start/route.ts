import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../../modules/course-management/controllers/QuizController';
import { getUserFromRequest } from '../../../../../../../shared/middleware/auth';

const controller = new QuizController();

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND' }, { status: 404 });
        }

        const lessonId = BigInt(params.id);

        const result = await controller.startQuiz(user.id, lessonId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error starting quiz:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'ACCESS_DENIED' ? 403 : (message === 'LESSON_NOT_FOUND' || message === 'NO_QUESTIONS_FOUND') ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
