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

        const lessonId = BigInt(params.id);

        const result = await controller.startQuiz(user.id, lessonId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error starting quiz:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
