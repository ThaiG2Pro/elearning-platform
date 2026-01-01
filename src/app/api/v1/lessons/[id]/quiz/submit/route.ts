import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '@/modules/course-management/controllers/QuizController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { SubmitQuizDto } from '@/modules/course-management/dtos/QuizResultDto';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = BigInt(params.id);
        const body: SubmitQuizDto = await request.json();

        const controller = new QuizController();
        const result = await controller.submitQuiz(userId, lessonId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Submit quiz error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
