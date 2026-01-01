import { ExcelAdapter } from '../../../shared/adapters/ExcelAdapter';
import { QuizValidationPolicy, QuizRow } from '../domain/QuizValidationPolicy';
import { ParsedQuestionDto } from '../dtos/ParsedQuestionDto';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { QuizQuestionsDto } from '../dtos/QuizQuestionsDto';
import { QuizPolicy } from '../domain/QuizPolicy';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
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
        private enrollmentRepo?: EnrollmentRepository,
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

    async uploadQuizForLesson(lessonId: bigint, file: Buffer): Promise<{ uploadedCount: number }> {
        if (!this.questionRepo) {
            throw new Error('QuestionRepository not provided');
        }

        // Step 1: Parse and validate file
        const parsedQuestions = await this.parseQuizFile(file);

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

        // Step 2: Data Transformation (Security) - Strip correct answers
        const blindQuestions = questions.map(q => ({
            id: q.id!,
            content: q.content,
            options: q.options,
        }));

        return { questions: blindQuestions };
    }

    async startQuiz(userId: bigint, lessonId: bigint): Promise<void> {
        if (!this.progressRepo || !this.enrollmentRepo) {
            throw new Error('Required repositories not provided');
        }

        // Find or create progress
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);
        if (!progress) {
            // Find enrollment
            const enrollment = await this.findEnrollmentByLesson(userId, lessonId);
            if (!enrollment) {
                throw new Error('ENROLLMENT_NOT_FOUND');
            }
            progress = LearningProgress.create(enrollment.id!, lessonId);
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
        if (!this.questionRepo || !this.progressRepo || !this.enrollmentRepo || !this.prisma) {
            throw new Error('Required repositories not provided');
        }

        // Step 0: Check timeout (BR-QUIZ-03)
        let progress = await this.progressRepo.findByStudentAndLesson(userId, lessonId);

        if (progress && progress.isQuizTimeout()) {
            // Auto-submit with 0 score
            const statusChanged = progress.updateQuizResult(0, false);
            if (statusChanged) {
                await this.recalculateCourseProgress(userId, progress.enrollmentId);
            }
            await this.progressRepo.save(progress);

            return {
                score: 0,
                isPassed: false,
                correction: {},
            };
        }

        // Get progress to get question ids
        if (!progress || !progress.quizQuestionIds || progress.quizQuestionIds.length === 0) {
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
            const correctIndex = QuizPolicy.keyToIndex(q.correctAnswer);

            if (userIndex != null && correctIndex >= 0 && userIndex === correctIndex) {
                correctCount++;
            }

            correction[questionIdStr] = `option_${correctIndex}`;
        }

        const totalAnswered = userAnswers.size;
        const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        const isPassed = score >= 80; // Rule 27: >= 80%

        // Step 2: Update Progress
        if (!progress) {
            // Find enrollment
            const enrollment = await this.findEnrollmentByLesson(userId, lessonId);
            if (!enrollment) {
                throw new Error('ENROLLMENT_NOT_FOUND');
            }
            progress = LearningProgress.create(enrollment.id!, lessonId);
        }

        const statusChanged = progress.updateQuizResult(score, isPassed);

        // Step 3: Persist
        await this.progressRepo.save(progress);

        // Step 4: Side Effect
        if (statusChanged) {
            await this.recalculateCourseProgress(userId, progress.enrollmentId);
        }

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
        // In a real system, you'd have a quiz_attempts table with history
        const totalQuestions = 10; // Assuming 10 questions per quiz
        const isPassed = progress.quizMaxScore >= 8; // Assuming 80% pass rate

        return [{
            id: progress.id!,
            score: progress.quizMaxScore,
            totalQuestions,
            isPassed,
            attemptedAt: new Date() // Would need to store attempt time
        }];
    }

    private async findEnrollmentByLesson(userId: bigint, lessonId: bigint): Promise<any> {
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

        const courseId = lesson.chapter.course.id;
        return await this.enrollmentRepo!.findByStudentAndCourse(userId, courseId);
    }

    private async recalculateCourseProgress(_userId: bigint, enrollmentId: bigint): Promise<void> {
        // Get enrollment to find courseId
        const enrollment = await this.enrollmentRepo!.findById(enrollmentId);
        if (!enrollment) return;

        // Get all lessons in the course
        const lessons = await this.prisma!.lessons.findMany({
            where: {
                chapter: {
                    course_id: enrollment.courseId
                }
            }
        });
        const totalLessons = lessons.length;

        // Get all progresses for this enrollment
        const progresses = await this.progressRepo!.findByEnrollment(enrollmentId);

        // Count finished lessons
        const finishedCount = progresses.filter(p => p.isFinished).length;

        // Calculate completion rate
        const completionRate = totalLessons > 0 ? Math.round((finishedCount / totalLessons) * 100) : 0;

        // Update enrollment
        enrollment.completionRate = completionRate;
        await this.enrollmentRepo!.save(enrollment);
    }
}
