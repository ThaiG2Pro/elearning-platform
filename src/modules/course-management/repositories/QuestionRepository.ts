import { Question } from '../domain/Question';
import { PrismaClient } from '@prisma/client';

export class QuestionRepository {
    constructor(private prisma: PrismaClient) { }

    async findRandomByLesson(lessonId: bigint, limit: number = 10): Promise<Question[]> {
        const questions = await this.prisma.questions.findMany({
            where: { lesson_id: lessonId },
        });

        // Convert to domain objects
        const domainQuestions = questions.map(q =>
            new Question(q.id, q.lesson_id, q.content, [q.option_a, q.option_b, q.option_c, q.option_d], q.answer_key)
        );

        // Shuffle and take limit
        const shuffled = domainQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(limit, shuffled.length));
    }

    async findByIds(questionIds: bigint[]): Promise<Question[]> {
        const questions = await this.prisma.questions.findMany({
            where: { id: { in: questionIds } },
        });

        return questions.map(q =>
            new Question(q.id, q.lesson_id, q.content, [q.option_a, q.option_b, q.option_c, q.option_d], q.answer_key)
        );
    }

    async replaceAllForLesson(lessonId: bigint, newQuestions: Omit<Question, 'id'>[]): Promise<void> {
        // Delete all existing questions for this lesson
        await this.prisma.questions.deleteMany({
            where: { lesson_id: lessonId }
        });

        // Insert new questions
        if (newQuestions.length > 0) {
            const data = newQuestions.map(q => ({
                lesson_id: q.lessonId,
                content: q.content,
                answer_key: q.correctAnswer,
                option_a: q.options[0] || '',
                option_b: q.options[1] || '',
                option_c: q.options[2] || '',
                option_d: q.options[3] || ''
            }));

            await this.prisma.questions.createMany({
                data
            });
        }
    }
}
