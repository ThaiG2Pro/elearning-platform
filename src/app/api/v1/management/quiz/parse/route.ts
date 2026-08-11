import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../modules/course-management/controllers/QuizController';
import { getUserIdFromRequest } from '../../../../../../shared/middleware/auth';
import { QuizPolicy } from '../../../../../../modules/course-management/domain/QuizPolicy';

export async function POST(request: NextRequest) {
    try {
        // Unlike its sibling management/lessons/[id]/quiz/upload — which
        // persists data and correctly requires auth — this route had no
        // auth check at all, letting anyone parse arbitrary Excel files
        // through the app's server for free with no rate limiting tied to
        // an account.
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are allowed' }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const controller = new QuizController();
        const parsedQuestions = await controller.parseQuizFile(buffer);

        // The client (`parseQuizFile` in lib/management.ts) types this
        // response as `QuizParseResponse` (`{ questions: QuizQuestion[] }`,
        // consumed by the edit page's "Xem trước danh sách câu hỏi" preview
        // as `q.text` / `q.correctId`) but this route was actually returning
        // `{ success, data: ParsedQuestionDto[], count }` — a completely
        // different, untransformed shape with no `questions` key at all and
        // no `text`/`correctId` fields on each item. `parsedQuestions.
        // questions.length` in the preview JSX crashed on `undefined` the
        // instant a lecturer clicked "Xem trước câu hỏi" — the preview
        // feature never actually rendered anything since parseQuizFile
        // existed. Reshape here (and compute correctId the same way
        // getLessonPreview does for the "existing questions" list) instead
        // of just satisfying the type — the type was correct, the runtime
        // response wasn't.
        const questions = parsedQuestions.map((q, idx) => {
            const correctIndexRaw = QuizPolicy.resolveCorrectIndex(q.correctAnswer, q.options);
            return {
                id: idx,
                text: q.content,
                content: q.content,
                options: q.options,
                correctId: correctIndexRaw >= 0 ? correctIndexRaw : undefined,
                correctIndex: correctIndexRaw >= 0 ? correctIndexRaw : undefined,
                answerKey: q.correctAnswer,
            };
        });

        return NextResponse.json({ questions });
    } catch (error: any) {
        console.error('Error parsing quiz file:', error);

        if (error.name === 'ExcelInvalidException') {
            return NextResponse.json({
                error: 'Invalid Excel format',
                details: error.message,
                row: error.rowNumber
            }, { status: 400 });
        }

        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
