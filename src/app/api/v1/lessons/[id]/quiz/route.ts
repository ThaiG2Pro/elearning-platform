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
        const result = await controller.generateQuiz(lessonId);

        // QuizQuestionsDto carries raw bigint question ids straight from the
        // domain layer — NextResponse.json's JSON.stringify throws "Do not
        // know how to serialize a BigInt" on those. This route calls
        // service.generateQuiz directly (bypassing QuizController.startQuiz,
        // which already does `.toString()` on ids before responding), so it
        // 500'd on every call once a lesson had ≥1 question. Same class of
        // bug as the lesson-preview route fix.
        return NextResponse.json({
            ...result,
            questions: result.questions.map(q => ({ ...q, id: q.id.toString() })),
        }, { status: 200 });
    } catch (error) {
        console.error('Error generating quiz:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message === 'NO_QUESTIONS_FOUND' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
