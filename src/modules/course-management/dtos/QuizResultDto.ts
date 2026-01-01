export interface SubmitQuizDto {
    answers: Record<string, string>; // questionId -> "option_X"
}

export interface SubmitQuizIndexDto {
    answers: Record<string, number>; // questionId -> selectedIndex (0-3)
}

export interface QuizResultDto {
    score: number;
    isPassed: boolean;
    correction: Record<string, string>; // questionId -> "option_X" (correct option)
}
