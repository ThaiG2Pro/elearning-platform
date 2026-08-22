export class Question {
    constructor(
        public id: bigint | null,
        public lessonId: bigint,
        public content: string,
        public options: string[],
        public correctAnswer: string | null,
    ) { }

    // Check if answer is correct
    isCorrect(answer: string): boolean {
        return this.correctAnswer === answer;
    }
}
