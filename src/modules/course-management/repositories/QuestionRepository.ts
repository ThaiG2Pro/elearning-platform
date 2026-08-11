import { Question } from '../domain/Question';
import { PrismaClient } from '@prisma/client';

// The `questions` table has exactly 4 fixed option columns (option_a..d).
// Rows authored with fewer than 4 options get padded with '' at insert time
// (see replaceAllForLesson) — reconstructing the options array here must
// drop those empty placeholders again, or a 2-option question comes back
// out as 4 options with 2 blank, clickable choices in the UI.
function buildOptions(q: { option_a: string; option_b: string; option_c: string; option_d: string }): string[] {
    return [q.option_a, q.option_b, q.option_c, q.option_d].filter(opt => opt.trim().length > 0);
}

export class QuestionRepository {
    constructor(private prisma: PrismaClient) { }

    async findRandomByLesson(lessonId: bigint, limit: number = 10): Promise<Question[]> {
        const questions = await this.prisma.questions.findMany({
            where: { lesson_id: lessonId },
        });

        // Convert to domain objects
        const domainQuestions = questions.map(q =>
            new Question(q.id, q.lesson_id, q.content, buildOptions(q), q.answer_key)
        );

        // Shuffle and take limit. `sort(() => 0.5 - Math.random())` (the
        // previous implementation) is a well-known biased shuffle — it does
        // pairwise comparisons whose outcome depends on the sort
        // algorithm's merge/partition pattern, not a uniform permutation, so
        // some questions are systematically more likely to land in the
        // first `limit` slots than others. Only matters once a lesson has
        // more questions than `limit` (10) — below that every question gets
        // picked regardless of shuffle quality — but a proper Fisher-Yates
        // costs nothing extra and removes the bias entirely.
        const shuffled = [...domainQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, Math.min(limit, shuffled.length));
    }

    async findByIds(questionIds: bigint[]): Promise<Question[]> {
        const questions = await this.prisma.questions.findMany({
            where: { id: { in: questionIds } },
        });

        return questions.map(q =>
            new Question(q.id, q.lesson_id, q.content, buildOptions(q), q.answer_key)
        );
    }

    async replaceAllForLesson(lessonId: bigint, newQuestions: Omit<Question, 'id'>[]): Promise<void> {
        const data = newQuestions.map(q => ({
            lesson_id: q.lessonId,
            content: q.content,
            answer_key: q.correctAnswer,
            option_a: q.options[0] || '',
            option_b: q.options[1] || '',
            option_c: q.options[2] || '',
            option_d: q.options[3] || ''
        }));

        // Delete + insert wrapped in a transaction — previously these were
        // two independent awaits, so a failure in createMany (DB blip, a
        // content/option string over the VarChar(255) column limit, etc.)
        // after deleteMany had already committed left the lesson with zero
        // questions and no rollback, with only a bare 500 to show for it.
        await this.prisma.$transaction([
            this.prisma.questions.deleteMany({ where: { lesson_id: lessonId } }),
            ...(data.length > 0 ? [this.prisma.questions.createMany({ data })] : []),
        ]);
    }
}
