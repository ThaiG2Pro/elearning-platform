export class LearningProgress {
    constructor(
        public id: bigint | null,
        public enrollmentId: bigint,
        public lessonId: bigint,
        public isFinished: boolean,
        public videoLastPosition: number | null,
        public quizMaxScore: number | null,
        public quizStartTime: Date | null,
        public personalNote: string | null,
        public quizQuestionIds: bigint[] | null = null,
    ) { }

    static create(enrollmentId: bigint, lessonId: bigint): LearningProgress {
        return new LearningProgress(
            null,
            enrollmentId,
            lessonId,
            false,
            null,
            null,
            null,
            null,
            null
        );
    }

    updatePosition(position: number): void {
        this.videoLastPosition = position;
    }

    tryFinish(isValidToFinish: boolean): boolean {
        if (!this.isFinished && isValidToFinish) {
            this.isFinished = true;
            return true; // Status changed
        }
        return false; // No change
    }

    updateQuizResult(score: number, isPassed: boolean): boolean {
        // Keep max score
        if (this.quizMaxScore === null || score > this.quizMaxScore) {
            this.quizMaxScore = score;
        }

        // Try finish if passed
        if (isPassed) {
            return this.tryFinish(true);
        }

        return false;
    }

    updateNote(content: string): void {
        this.personalNote = content;
    }

    startQuiz(): void {
        // Always reset the start time when starting a new quiz attempt
        this.quizStartTime = new Date();
    }

    setQuizQuestions(questionIds: bigint[]): void {
        this.quizQuestionIds = questionIds;
    }

    isQuizTimeout(): boolean {
        if (this.quizStartTime === null) return false;
        const now = new Date();
        const elapsed = now.getTime() - this.quizStartTime.getTime();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        return elapsed > tenMinutes;
    }
}
