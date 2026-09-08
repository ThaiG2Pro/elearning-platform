import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../../../modules/space-management/controllers/QuizController';
import { getUserFromRequest } from '../../../../../../../../shared/middleware/auth';
import { applyRateLimit, UPLOAD_RATE_LIMITS, QUIZ_UPLOAD_MAX_BYTES } from '../../../../../../../../shared/middleware/rateLimit';
import { parseIdParam } from '../../../../../../../../shared/http/params';
import { safeErrorMessage } from '../../../../../../../../shared/http/routeErrors';

const controller = new QuizController();

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lessonId = parseIdParam(params.id);
        if (lessonId === null) {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND', message: 'Bài học không tồn tại' }, { status: 404 });
        }

        const limited = applyRateLimit([
            { bucket: 'quiz-upload:user', key: user.id.toString(), ...UPLOAD_RATE_LIMITS.quizUploadPerUser },
        ]);
        if (limited) return limited;

        // Get file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'NO_FILE', message: 'No file provided' }, { status: 400 });
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
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Upload quiz questions (BR-UPLOAD-01: Replace all)
        const result = await controller.uploadQuizForLesson(user.id, lessonId, fileBuffer);

        return NextResponse.json({
            message: 'Quiz questions uploaded successfully',
            uploadedCount: result.uploadedCount
        });

    } catch (error) {
        console.error('Error uploading quiz:', error);
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED', message: 'Bạn không sở hữu bài học này' }, { status: 403 });
        }
        if (error instanceof Error && error.message === 'LESSON_NOT_FOUND') {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND', message: 'Bài học không tồn tại' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'EMPTY_QUIZ_FILE') {
            return NextResponse.json({ error: 'EMPTY_QUIZ_FILE', message: 'Tệp Excel không chứa câu hỏi nào' }, { status: 400 });
        }
        // Row-level validation errors (missing fields, too many/few options,
        // CorrectAnswer not matching an option) were previously falling
        // through to a bare 500 here — this route never had the same
        // ExcelInvalidException -> 400 mapping its sibling parse-preview
        // route already had.
        if (error instanceof Error && error.name === 'ExcelInvalidException') {
            return NextResponse.json({ error: 'INVALID_EXCEL_FORMAT', message: error.message }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: safeErrorMessage(message, 500) }, { status: 500 });
    }
}
