export interface GradeResult {
    score: number;
    isPassed: boolean;
    correction: Map<string, string>; // questionId -> "option_X"
}

export class QuizPolicy {
    /**
     * Resolves which option index a stored `answer_key` refers to.
     *
     * The upload pipeline requires `CorrectAnswer` in the source Excel to
     * equal the exact text of one of the row's options (see
     * QuizValidationPolicy.validateRowStructure), and QuizService stores
     * that matched text verbatim (uppercased) as `answer_key` — NOT a bare
     * letter. Grading used to run that value through a letter-index decode
     * (`key.charCodeAt(0) - 65`, i.e. treating "Berlin" as if it meant
     * option "B") that only worked by coincidence when the correct
     * option's text happened to start with the intended letter. Any other
     * text — numeric options like "4", or a correct answer whose first
     * letter didn't match its position — produced a garbage index,
     * silently making the question ungradable no matter what a student
     * picked. This matches the stored text against the real options list
     * first (the actual contract upload enforces), and only falls back to
     * the bare-letter decode for hand-authored/seeded rows that store a
     * literal 'A'-'D'.
     */
    static resolveCorrectIndex(answerKey: string | null | undefined, options: string[]): number {
        if (!answerKey) return -1;
        const trimmed = answerKey.trim();
        if (!trimmed) return -1;

        const textIndex = options.findIndex(opt => opt.trim().toUpperCase() === trimmed.toUpperCase());
        if (textIndex >= 0) return textIndex;

        const letterIndex = trimmed.toUpperCase().charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, ...
        return letterIndex >= 0 && letterIndex < options.length ? letterIndex : -1;
    }
}
