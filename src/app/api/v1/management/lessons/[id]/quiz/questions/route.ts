import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../../../modules/space-management/controllers/QuizController';
import { getUserFromRequest } from '../../../../../../../../shared/middleware/auth';

const controller = new QuizController();

/**
 * Lưu bộ câu hỏi quiz từ JSON đã parse sẵn — dùng bởi luồng "AI tạo quiz"
 * trong editor (bổ sung hình dung ban đầu, chưa từng có trong ROADMAP/wayfinder:
 * dán link → vào editor → AI tự sinh quiz ngay tại đó, không chỉ upload
 * Excel thủ công). Cùng ràng buộc replace-all (BR-UPLOAD-01) và cùng luật
 * validate (QuizValidationPolicy.validateParsedQuestion) như /quiz/upload —
 * chỉ khác nguồn input là JSON thay vì file Excel, tránh có 2 bộ luật khác
 * nhau cho cùng 1 khái niệm "câu hỏi hợp lệ".
 *
 * AI chỉ SINH nội dung khi user chủ động bấm nút ở editor (xem
 * AIGenerationService/generateAIContent) — route này không tự chạy AI, chỉ
 * nhận kết quả user đã xem trước và chủ động xác nhận muốn lưu thành bài quiz.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // BigInt() throw với id không phải số → rơi nhầm vào nhánh 500;
        // validate trước để trả 400 đúng nghĩa lỗi input.
        if (!/^\d+$/.test(params.id)) {
            return NextResponse.json({ error: 'INVALID_LESSON_ID', message: 'id bài học không hợp lệ' }, { status: 400 });
        }
        const lessonId = BigInt(params.id);
        const body = await request.json();
        const questions = body?.questions;

        if (!Array.isArray(questions)) {
            return NextResponse.json({ error: 'INVALID_BODY', message: 'questions phải là 1 mảng' }, { status: 400 });
        }

        const result = await controller.saveGeneratedQuestions(user.id, lessonId, questions);

        return NextResponse.json({
            message: 'Đã lưu câu hỏi quiz',
            savedCount: result.savedCount,
        });

    } catch (error) {
        console.error('Error saving generated quiz questions:', error);
        if (error instanceof Error && error.message === 'ACCESS_DENIED') {
            return NextResponse.json({ error: 'ACCESS_DENIED', message: 'Bạn không sở hữu bài học này' }, { status: 403 });
        }
        if (error instanceof Error && error.message === 'LESSON_NOT_FOUND') {
            return NextResponse.json({ error: 'LESSON_NOT_FOUND', message: 'Bài học không tồn tại' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'EMPTY_QUIZ_FILE') {
            return NextResponse.json({ error: 'EMPTY_QUIZ_FILE', message: 'Không có câu hỏi nào để lưu' }, { status: 400 });
        }
        if (error instanceof Error && error.name === 'ExcelInvalidException') {
            return NextResponse.json({ error: 'INVALID_QUESTIONS', message: error.message }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
