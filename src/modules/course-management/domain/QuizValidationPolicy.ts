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

        // Validate options format (should be pipe-separated). The
        // `questions` table has exactly 4 fixed columns (option_a..d) —
        // anything beyond the 4th was previously truncated silently at
        // insert time, which could drop the actual correct answer's text
        // with no error at upload time.
        const options = row.Options.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);
        if (options.length < 2) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: At least 2 options required, separated by |`);
        }
        if (options.length > 4) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: At most 4 options are supported, got ${options.length}`);
        }

        // Validate correct answer is one of the options
        const correctAnswer = row.CorrectAnswer.trim();
        if (!options.includes(correctAnswer)) {
            throw new ExcelInvalidException(rowIndex, `Row ${rowIndex}: CorrectAnswer must be one of the provided options`);
        }
    }
}
