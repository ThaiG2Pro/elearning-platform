import { QuizPolicy } from './QuizPolicy';

export interface QuizRow {
    Content?: string;
    Options?: string;
    CorrectAnswer?: string;
    [key: string]: any;
}

export class ExcelInvalidException extends Error {
    constructor(public rowNumber: number, message: string) {
        super(message);
        this.name = 'ExcelInvalidException';
    }
}

export interface ParsedQuestionLike {
    content?: string;
    options?: string[];
    correctAnswer?: string;
}

export class QuizValidationPolicy {
    static validateRowStructure(row: QuizRow, rowIndex: number): void {
        // Rule 44: Check required fields
        if (!row.Content || typeof row.Content !== 'string' || row.Content.trim() === '') {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: Content is required and must be non-empty`);
        }

        if (!row.Options || typeof row.Options !== 'string' || row.Options.trim() === '') {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: Options is required and must be non-empty`);
        }

        if (!row.CorrectAnswer || typeof row.CorrectAnswer !== 'string' || row.CorrectAnswer.trim() === '') {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: CorrectAnswer is required and must be non-empty`);
        }

        // Options format (pipe-separated) is specific to the Excel row shape
        // — split it here, then hand the already-parsed shape to
        // `validateParsedQuestion` so the actual content/count/correctness
        // rules below live in exactly one place, shared with the AI-quiz
        // JSON path (see QuizService.saveGeneratedQuestions).
        const options = row.Options.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);
        this.validateParsedQuestion(
            { content: row.Content.trim(), options, correctAnswer: row.CorrectAnswer.trim() },
            rowIndex,
        );
    }

    /**
     * Same rule set as `validateRowStructure`, but for input that's already
     * shaped as `{content, options, correctAnswer}` (an array, not a
     * pipe-separated string) — the shape `ParsedQuestionDto` and an
     * AI-generated quiz (see `AIGenerationService`'s quiz prompt +
     * `parseAIQuizContent` on the client) both use. Kept as one function so
     * "a valid quiz question" means exactly the same thing regardless of
     * whether it came from an Excel upload or an AI generation — no second,
     * looser bar for AI-sourced content.
     */
    static validateParsedQuestion(q: ParsedQuestionLike, rowIndex: number): void {
        if (!q.content || typeof q.content !== 'string' || q.content.trim() === '') {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: Content is required and must be non-empty`);
        }

        // Storage không còn giới hạn số đáp án (options là jsonb array từ
        // 2026-08-21) — trần 4 dưới đây giờ là business rule thuần (UI quiz
        // thiết kế cho A-D); nới chỉ cần đổi đúng chỗ này.
        const options = Array.isArray(q.options) ? q.options : [];
        if (options.length < 2) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: At least 2 options required`);
        }
        if (options.length > 4) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: At most 4 options are supported, got ${options.length}`);
        }

        // Validate correct answer resolves to one of the options. This must
        // use the exact same rule the grader (QuizPolicy.resolveCorrectIndex)
        // applies at submit time — it matches option text case-insensitively
        // AND falls back to a bare letter ('A'-'D', as seed data and some
        // hand-authored sheets use). The old check here was a strict,
        // case-sensitive `options.includes(correctAnswer)` with no letter
        // fallback: a perfectly gradable file (e.g. CorrectAnswer="A", or
        // CorrectAnswer="đúng" against an option "Đúng") was rejected at
        // upload time even though QuizService/QuizPolicy would have graded
        // it correctly. Validation must not be stricter than grading.
        if (!q.correctAnswer || typeof q.correctAnswer !== 'string' || q.correctAnswer.trim() === '') {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: CorrectAnswer is required and must be non-empty`);
        }
        if (QuizPolicy.resolveCorrectIndex(q.correctAnswer.trim(), options) < 0) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: CorrectAnswer must match one of the provided options (by text, case-insensitive) or be a valid option letter (A-${String.fromCharCode(64 + options.length)})`);
        }
    }
}
