export class LearningProgress {
    // BR-QUIZ-03 — the single source of truth for how long a quiz attempt
    // stays valid. Previously the controller advertised a 30-minute
    // countdown to the frontend (`expiresAt`) while `isQuizTimeout()` below
    // enforced 10 minutes server-side — a student who took 15 minutes (well
    // within what the UI showed) got silently force-scored 0 on submit.
    static readonly QUIZ_TIME_LIMIT_MS = 10 * 60 * 1000;

    constructor(
        public id: bigint | null,
        public userId: bigint,
        public courseId: bigint,
        public lessonId: bigint,
        public isFinished: boolean,
        public videoLastPosition: number | null,
        public quizMaxScore: number | null,
        public quizStartTime: Date | null,
        public personalNote: string | null,
        public quizQuestionIds: bigint[] | null = null,
    ) { }

    /** WP1.3: progress identity is (userId, lessonId) — ownership, not enrollment. */
    static create(userId: bigint, courseId: bigint, lessonId: bigint): LearningProgress {
        return new LearningProgress(
            null,
            userId,
            courseId,
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
        return elapsed > LearningProgress.QUIZ_TIME_LIMIT_MS;
    }

    /**
     * Consumes the current quiz attempt after grading — nulls the start
     * time so a second submit() call for the same attempt can't be graded
     * again (both submitQuiz call sites treat quizStartTime === null as
     * "no active attempt"). `quizQuestionIds` is deliberately left as-is:
     * it doubles as the historical record of how many questions the last
     * attempt had (see QuizService.getQuizResults). Without this consume
     * step, an attempt stayed "open" until the 10-minute wall clock ran
     * out: a student could submit once, read back the correct answers the
     * response reveals per-question, then submit again with those answers
     * for a guaranteed 100%, as many times as they liked within the window.
     */
    consumeQuizAttempt(): void {
        this.quizStartTime = null;
    }
}
