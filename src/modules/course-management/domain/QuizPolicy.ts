export interface GradeResult {
    score: number;
    isPassed: boolean;
    correction: Map<string, string>; // questionId -> "option_X"
}

export class QuizPolicy {
    // Convert answer_key to index (A=0, B=1, C=2, D=3)
    static keyToIndex(key: string | null): number {
        if (!key) return -1;
        return key.toUpperCase().charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.
    }
}
