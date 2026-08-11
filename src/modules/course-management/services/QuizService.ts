import { ExcelAdapter } from '../../../shared/adapters/ExcelAdapter';
import { QuizValidationPolicy, QuizRow } from '../domain/QuizValidationPolicy';
import { ParsedQuestionDto } from '../dtos/ParsedQuestionDto';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { QuizQuestionsDto } from '../dtos/QuizQuestionsDto';
import { QuizPolicy } from '../domain/QuizPolicy';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { LearningProgress } from '../domain/LearningProgress';
import { QuizResultDto, SubmitQuizIndexDto } from '../dtos/QuizResultDto';
import { Question } from '../domain/Question';
import { PrismaClient } from '@prisma/client';

export interface QuizAttemptDto {
    id: bigint;
    score: number;
    totalQuestions: number;
    isPassed: boolean;
    attemptedAt: Date;
}

export class QuizService {
    private excelAdapter: ExcelAdapter;

    constructor(
        private questionRepo?: QuestionRepository,
        private progressRepo?: LearningProgressRepository,
        // WP1.6 follow-up — dropped the dead `_enrollmentRepo` compatibility
        // param and its matching call-site arg.
        private prisma?: PrismaClient
    ) {
        this.excelAdapter = new ExcelAdapter();
    }

    async parseQuizFile(file: Buffer): Promise<ParsedQuestionDto[]> {
        const rawDataList = await this.excelAdapter.readToObjects(file);

        const parsedQuestions: ParsedQuestionDto[] = [];

        for (let i = 0; i < rawDataList.length; i++) {
            const row = rawDataList[i] as QuizRow;
            const rowNumber = i + 2; // +2 because Excel is 1-indexed and we skip header

            // Validate row structure
            QuizValidationPolicy.validateRowStructure(row, rowNumber);

            // Parse the validated row
            const options = row.Options!.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);

            parsedQuestions.push({
                content: row.Content!.trim(),
                options: options,
                correctAnswer: row.CorrectAnswer!.trim().toUpperCase(),
            });
        }

        return parsedQuestions;
    }

    // WP1.6.4 — ownership-based, not role-gated. The route used to block
    // any non-LECTURER/ADMIN role, which meant a STUDENT-role user (the
    // default role for every new signup — see WP1.5.10) couldn't upload a
    // quiz to a lesson inside a course they themselves own.
    async uploadQuizForLesson(userId: bigint, lessonId: bigint, file: Buffer): Promise<{ uploadedCount: number }> {
        if (!this.questionRepo) {
            throw new Error('QuestionRepository not provided');
        }
        if (this.prisma) {
            const lesson = await this.prisma.lessons.findUnique({
                where: { id: lessonId },
                include: { chapter: { include: { course: true } } },
            });
            if (!lesson) {
                throw new Error('LESSON_NOT_FOUND');
            }
            AccessControlPolicy.validateOwnership(userId, lesson.chapter.course.owner_id);
        }

        // Step 1: Parse and validate file
        const parsedQuestions = await this.parseQuizFile(file);

        // A header-only or genuinely empty workbook parses to `[]` with no
        // error — without this check, replaceAllForLesson would still run
        // its delete step and wipe out every existing question for this
        // lesson, then report `{ uploadedCount: 0 }` as a 200 success. A
        // lecturer fat-fingering an empty file would silently destroy their
        // entire question bank with no warning.
        if (parsedQuestions.length === 0) {
            throw new Error('EMPTY_QUIZ_FILE');
        }

        // Step 2: Convert to domain objects
        const domainQuestions: Omit<Question, 'id'>[] = parsedQuestions.map(dto =>
            new Question(BigInt(0), lessonId, dto.content, dto.options, dto.correctAnswer)
        );

        // Step 3: Replace all questions for this lesson (BR-UPLOAD-01)
        await this.questionRepo.replaceAllForLesson(lessonId, domainQuestions);

        return { uploadedCount: parsedQuestions.length };
    }

    async generateQuiz(lessonId: bigint): Promise<QuizQuestionsDto> {
        if (!this.questionRepo) {
            throw new Error('QuestionRepository not provided');
        }

        // Step 1: Get Random Questions
        const questions = await this.questionRepo.findRandomByLesson(lessonId, 10);

        // A QUIZ lesson with no uploaded questions used to sail through here
        // silently: startQuiz would persist an "in progress" row with an
        // empty quizQuestionIds array and return 200 with `questions: []`,
        // so the student saw a quiz they could never finish — submit then
        // failed with the confusing "Quiz not started" (technically true:
        // there were never any questions to start). Both callers of this
        // (quiz/start and the bare quiz/route.ts preview) already had
        // NO_QUESTIONS_FOUND -> 404 mapping wired up and waiting for this.
        if (questions.length === 0) {
            throw new Error('NO_QUESTIONS_FOUND');
        }

        // Step 2: Data Transformation (Security) - Strip correct answers
        const blindQuestions = questions.map(q => ({
            id: q.id!,
            content: q.content,
            options: q.options,
        }));

        return { questions: blindQuestions };
    }

    async startQuiz(userId: bigint, lessonId: bigint): Promise<void> {
        if (!this.progressRepo || !this.questionRepo) {
            throw new Error('Required repositories not provided');
        }

        // Find or create progress
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress) {
            const courseId = await this.findCourseIdByLesson(lessonId);
            progress = LearningProgress.create(userId, courseId, lessonId);
        }

        // If there's already a live, unconsumed attempt (quizStartTime set,
        // not timed out — see consumeQuizAttempt), reuse it instead of
        // rerolling a fresh random question set. Without this, two
        // concurrent start calls for the same student (double-click, two
        // browser tabs) each independently pick 10 random questions and
        // save whichever wins the race — but the FIRST call's response has
        // already been sent to that tab with the OTHER set's questions, so
        // that tab's student answers questions the persisted progress row
        // no longer references, and grades 0 regardless of correctness.
        //
        // Guard: only reuse if those question ids still actually resolve.
        // If a lecturer re-uploaded the quiz (replaceAllForLesson deletes +
        // recreates all rows) while this attempt was still "live", the old
        // ids are gone — reusing them would hand back an empty question
        // list instead of the current quiz.
        if (progress.quizStartTime !== null && !progress.isQuizTimeout() && progress.quizQuestionIds && progress.quizQuestionIds.length > 0) {
            const stillValid = await this.questionRepo!.findByIds(progress.quizQuestionIds);
            if (stillValid.length === progress.quizQuestionIds.length) {
                return;
            }
        }

        // Start quiz timer
        progress.startQuiz();

        // Generate quiz questions and store ids
        const quizData = await this.generateQuiz(lessonId);
        const questionIds = quizData.questions.map(q => q.id!);
        progress.setQuizQuestions(questionIds);

        // Persist
        await this.progressRepo.save(progress);
    }

    async getProgress(userId: bigint, lessonId: bigint): Promise<LearningProgress | null> {
        const progress = await this.progressRepo?.findByStudentAndLesson(userId, lessonId);
        return progress || null;
    }

    async submitQuiz(userId: bigint, lessonId: bigint, dto: SubmitQuizIndexDto): Promise<QuizResultDto> {
        if (!this.questionRepo || !this.progressRepo || !this.prisma) {
            throw new Error('Required repositories not provided');
        }

        // Step 0: Check timeout (BR-QUIZ-03)
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);

        if (progress && progress.isQuizTimeout()) {
            // Auto-submit with 0 score
            progress.updateQuizResult(0, false);
            progress.consumeQuizAttempt();
            await this.progressRepo.save(progress);

            return {
                score: 0,
                isPassed: false,
                correction: {},
            };
        }

        // Get progress to get question ids. `quizStartTime === null` covers
        // both "never started" and "already consumed by a prior submit"
        // (see LearningProgress.consumeQuizAttempt) — without the latter, a
        // student could resubmit repeatedly using the correct answers the
        // first response reveals.
        if (!progress || progress.quizStartTime === null || !progress.quizQuestionIds || progress.quizQuestionIds.length === 0) {
            throw new Error('Quiz not started');
        }

        // Get questions data for grading and response building
        const questionsData = await this.questionRepo.findByIds(progress.quizQuestionIds);

        // Convert answers to Map of indices
        const userAnswers = new Map<string, number>();
        for (const [questionId, selectedIndex] of Object.entries(dto.answers)) {
            // Trim key để tránh " 7 " !== "7"
            userAnswers.set(questionId.trim(), selectedIndex);
        }

        // Step 1: Grade quiz using the same questionsData
        let correctCount = 0;
        const correction: Record<string, string> = {};

        for (const q of questionsData) {
            const questionIdStr = q.id!.toString();
            const userIndex = userAnswers.get(questionIdStr);
            const correctIndex = QuizPolicy.resolveCorrectIndex(q.correctAnswer, q.options);

            if (userIndex != null && correctIndex >= 0 && userIndex === correctIndex) {
                correctCount++;
            }

            correction[questionIdStr] = `option_${correctIndex}`;
        }

        // Score is a percentage of the QUIZ's total questions, not of how
        // many the student bothered to answer — grading against
        // `userAnswers.size` let a student answer only the 1 question they
        // knew, leave the rest blank, and still score 100%. Unanswered
        // questions are simply wrong, same as any other incorrect pick.
        const totalQuestions = questionsData.length;
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const isPassed = score >= 80; // Rule 27: >= 80%

        // Step 2: Update Progress
        if (!progress) {
            const courseId = await this.findCourseIdByLesson(lessonId);
            progress = LearningProgress.create(userId, courseId, lessonId);
        }

        progress.updateQuizResult(score, isPassed);
        // Consume the attempt so a second submit() call can't be graded
        // again using the correct answers this very response reveals.
        progress.consumeQuizAttempt();

        // Step 3: Persist
        await this.progressRepo.save(progress);

        return {
            score,
            isPassed,
            correction,
        };
    }

    async getQuizResults(userId: bigint, lessonId: bigint): Promise<QuizAttemptDto[]> {
        if (!this.progressRepo) {
            throw new Error('ProgressRepository not provided');
        }

        const progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress || progress.quizMaxScore === null) {
            return [];
        }

        // For now, return the current best attempt
        // In a real system, you'd have a quiz_attempts table with history.
        // `quizMaxScore` is always a 0-100 percentage (see submitQuiz) — this
        // used to compare it against 8 and report a hardcoded 10 questions,
        // as if it were a raw "N correct out of 10" count. A 10% score
        // (quizMaxScore = 10) was reported as passed (10 >= 8) even though
        // the actual pass bar submitQuiz enforces is 80%.
        const totalQuestions = progress.quizQuestionIds?.length ?? 0;
        const isPassed = progress.quizMaxScore >= 80; // Rule 27: >= 80%, matches submitQuiz

        return [{
            id: progress.id!,
            score: progress.quizMaxScore,
            totalQuestions,
            isPassed,
            attemptedAt: new Date() // Would need to store attempt time
        }];
    }

    private async findCourseIdByLesson(lessonId: bigint): Promise<bigint> {
        const lesson = await this.prisma!.lessons.findUnique({
            where: { id: lessonId },
            include: {
                chapter: {
                    include: {
                        course: true
                    }
                }
            }
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        return lesson.chapter.course.id;
    }
}
