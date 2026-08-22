export interface QuizQuestionDto {
    id: bigint;
    content: string;
    options: string[];
}

export interface QuizQuestionsDto {
    questions: QuizQuestionDto[];
}
