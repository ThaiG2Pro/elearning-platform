import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../modules/space-management/controllers/QuizController';
import { getUserIdFromRequest } from '../../../../../../shared/middleware/auth';
import { QuizPolicy } from '../../../../../../modules/space-management/domain/QuizPolicy';
import { applyRateLimit, UPLOAD_RATE_LIMITS, QUIZ_UPLOAD_MAX_BYTES } from '../../../../../../shared/middleware/rateLimit';
import { safeErrorMessage } from '../../../../../../shared/http/routeErrors';

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

        const limited = applyRateLimit([
            { bucket: 'quiz-parse:user', key: userId.toString(), ...UPLOAD_RATE_LIMITS.quizUploadPerUser },
        ]);
        if (limited) return limited;

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type — only OOXML .xlsx (the parser does not read legacy .xls)
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'Only .xlsx files are allowed' }, { status: 400 });
        }
        // Size cap: the whole file is buffered in memory before parsing.
        if (file.size > QUIZ_UPLOAD_MAX_BYTES) {
            return NextResponse.json({ error: 'FILE_TOO_LARGE', message: `File must be at most ${QUIZ_UPLOAD_MAX_BYTES / 1024 / 1024} MB` }, { status: 413 });
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
        return NextResponse.json({ error: safeErrorMessage(message, 500) }, { status: 500 });
    }
}
