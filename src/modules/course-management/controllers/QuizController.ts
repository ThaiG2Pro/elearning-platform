import { QuizService } from '../services/QuizService';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { ParsedQuestionDto } from '../dtos/ParsedQuestionDto';
import { QuizQuestionsDto } from '../dtos/QuizQuestionsDto';
import { SubmitQuizDto, SubmitQuizIndexDto } from '../dtos/QuizResultDto';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
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
        const enrollmentRepo = new EnrollmentRepository(prisma);
        this.questionRepo = questionRepo;
        this.service = new QuizService(questionRepo, progressRepo, enrollmentRepo, prisma);
    }

    async parseQuizFile(file: Buffer): Promise<ParsedQuestionDto[]> {
        return await this.service.parseQuizFile(file);
    }

    async uploadQuizForLesson(lessonId: bigint, file: Buffer): Promise<{ uploadedCount: number }> {
        return await this.service.uploadQuizForLesson(lessonId, file);
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
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

        return {
            sessionId,
            questions,
            expiresAt
        };
    }

    async submitQuiz(userId: bigint, lessonId: bigint, dto: SubmitQuizDto): Promise<any> {
        // Get progress to get question ids
        const progress = await this.service.getProgress(userId, lessonId);
        if (!progress || !progress.quizQuestionIds || progress.quizQuestionIds.length === 0) {
            throw new Error('Quiz not started');
        }

        // Convert answers from "option_X" to indices
        const answersIndex: Record<string, number> = {};
        for (const [questionIdStr, answerRaw] of Object.entries(dto.answers)) {
            if (answerRaw.startsWith('option_')) {
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
            if (userAnswerRaw && userAnswerRaw.startsWith('option_')) {
                const index = parseInt(userAnswerRaw.split('_')[1]);
                if (!isNaN(index) && index >= 0 && index < q.options.length) {
                    selectedIndex = index;
                }
            }

            // Get correct index from answer_key (NOT from correction result)
            const correctIndexRaw = QuizPolicy.keyToIndex(q.correctAnswer);
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
            questions,
            submittedAt: new Date().toISOString()
        };
    }

    async getQuizResults(userId: bigint, lessonId: bigint): Promise<QuizAttemptDto[]> {
        return await this.service.getQuizResults(userId, lessonId);
    }
}
