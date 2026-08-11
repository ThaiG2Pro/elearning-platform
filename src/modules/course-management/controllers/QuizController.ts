import { QuizService } from '../services/QuizService';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { ParsedQuestionDto } from '../dtos/ParsedQuestionDto';
import { QuizQuestionsDto } from '../dtos/QuizQuestionsDto';
import { SubmitQuizDto, SubmitQuizIndexDto } from '../dtos/QuizResultDto';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { LearningProgress } from '../domain/LearningProgress';
import { prisma } from '../../../shared/config/database';
import { Question } from '../domain/Question';
import { QuizPolicy } from '../domain/QuizPolicy';

export interface QuizAttemptDto {
    id: bigint;
    score: number;
    totalQuestions: number;
    isPassed: boolean;
    attemptedAt: Date;
}

export class QuizController {
    private service: QuizService;
    private questionRepo: QuestionRepository;

    constructor() {
        const questionRepo = new QuestionRepository(prisma);
        const progressRepo = new LearningProgressRepository(prisma);
        this.questionRepo = questionRepo;
        this.service = new QuizService(questionRepo, progressRepo, prisma);
    }

    async parseQuizFile(file: Buffer): Promise<ParsedQuestionDto[]> {
        return await this.service.parseQuizFile(file);
    }

    async uploadQuizForLesson(userId: bigint, lessonId: bigint, file: Buffer): Promise<{ uploadedCount: number }> {
        return await this.service.uploadQuizForLesson(userId, lessonId, file);
    }

    async generateQuiz(lessonId: bigint): Promise<QuizQuestionsDto> {
        return await this.service.generateQuiz(lessonId);
    }

    async startQuiz(userId: bigint, lessonId: bigint): Promise<{ sessionId: string; questions: any[]; expiresAt: string }> {
        await this.service.startQuiz(userId, lessonId);

        // Get progress to get question ids
        const progress = await this.service.getProgress(userId, lessonId);
        if (!progress || !progress.quizQuestionIds) {
            throw new Error('Quiz not started properly');
        }

        // Get questions by ids
        const questionsData = await this.questionRepo.findByIds(progress.quizQuestionIds);

        // Map to FE format
        const questions = questionsData.map((q: Question) => ({
            id: q.id!.toString(),
            text: q.content,
            options: q.options.map((opt, optIndex) => ({
                id: `option_${optIndex}`,
                text: opt.replace(/\s+/g, ' ').trim() // Normalize options sent to FE
            }))
        }));

        // Create session info
        const sessionId = `quiz_${lessonId}_${Date.now()}`;
        // BR-QUIZ-03 — must match LearningProgress.isQuizTimeout()'s actual
        // enforcement window, or the countdown shown to the student lies
        // about how long they really have (see LearningProgress.QUIZ_TIME_LIMIT_MS).
        //
        // This must be derived from `progress.quizStartTime`, NOT `Date.now()`.
        // QuizService.startQuiz's re-entry guard (added to fix the
        // double-start race) reuses an existing live attempt without calling
        // `progress.startQuiz()` again — quizStartTime stays at its original
        // value. Computing expiresAt from `Date.now()` here regardless meant
        // a student reloading mid-attempt (e.g. at minute 5 of 10) was handed
        // a brand new "10 minutes left" countdown, while the server's actual
        // isQuizTimeout() check still enforced the original minute-10
        // deadline — the countdown looked like it had 5 extra minutes it
        // didn't really have, and submitting in that gap silently auto-
        // scored 0 with no warning.
        const expiresAt = new Date((progress.quizStartTime ?? new Date()).getTime() + LearningProgress.QUIZ_TIME_LIMIT_MS).toISOString();

        return {
            sessionId,
            questions,
            expiresAt
        };
    }

    async submitQuiz(userId: bigint, lessonId: bigint, dto: SubmitQuizDto): Promise<any> {
        // `dto` is `request.json()` output at the route boundary — nothing
        // guarantees `.answers` actually exists (a client sending `{}` or a
        // malformed body). Object.entries(undefined) throws immediately,
        // which used to surface as a raw, unhandled 500. Missing answers
        // should just grade as "nothing answered", not crash the request.
        if (!dto.answers || typeof dto.answers !== 'object') {
            dto = { ...dto, answers: {} };
        }

        // Get progress to get question ids. Same combined check as
        // QuizService.submitQuiz — quizStartTime === null also covers an
        // attempt already consumed by a prior submit (anti-resubmit guard).
        const progress = await this.service.getProgress(userId, lessonId);
        if (!progress || progress.quizStartTime === null || !progress.quizQuestionIds || progress.quizQuestionIds.length === 0) {
            throw new Error('Quiz not started');
        }

        // Convert answers from "option_X" to indices
        const answersIndex: Record<string, number> = {};
        for (const [questionIdStr, answerRaw] of Object.entries(dto.answers)) {
            // `answerRaw` is client-controlled JSON — any value the DTO type
            // doesn't actually enforce at runtime (a number, `null`, an
            // object) reached `.startsWith` directly and crashed the whole
            // request with a raw, unhandled "answerRaw.startsWith is not a
            // function" 500 instead of just skipping that one bad answer.
            if (typeof answerRaw === 'string' && answerRaw.startsWith('option_')) {
                const index = parseInt(answerRaw.split('_')[1]);
                if (!isNaN(index) && index >= 0 && index <= 3) {
                    answersIndex[questionIdStr] = index;
                }
            }
        }

        const dtoIndex: SubmitQuizIndexDto = { answers: answersIndex };

        const result = await this.service.submitQuiz(userId, lessonId, dtoIndex);

        // Get questions by ids for response mapping
        const questionsData = await this.questionRepo.findByIds(progress.quizQuestionIds);

        // Map questions with user answers and corrections
        const questions = questionsData.map((q: Question) => {
            const questionIdStr = q.id!.toString();
            const userAnswerRaw = dto.answers[questionIdStr];

            // Parse user answer: if it's "option_X", get the index
            let selectedIndex: number | undefined;
            if (typeof userAnswerRaw === 'string' && userAnswerRaw.startsWith('option_')) {
                const index = parseInt(userAnswerRaw.split('_')[1]);
                if (!isNaN(index) && index >= 0 && index < q.options.length) {
                    selectedIndex = index;
                }
            }

            // Get correct index from answer_key (NOT from correction result)
            const correctIndexRaw = QuizPolicy.resolveCorrectIndex(q.correctAnswer, q.options);
            const correctIndex = correctIndexRaw >= 0 ? correctIndexRaw : null;

            return {
                id: questionIdStr,
                text: q.content,
                options: q.options.map((opt, optIndex) => ({
                    id: `option_${optIndex}`,
                    text: opt
                })),
                selectedId: selectedIndex !== undefined ? `option_${selectedIndex}` : undefined,
                correctId: correctIndex !== null ? `option_${correctIndex}` : undefined
            };
        });

        return {
            score: result.score,
            isPassed: result.isPassed,
            questions,
            submittedAt: new Date().toISOString()
        };
    }

    async getQuizResults(userId: bigint, lessonId: bigint): Promise<QuizAttemptDto[]> {
        return await this.service.getQuizResults(userId, lessonId);
    }
}
