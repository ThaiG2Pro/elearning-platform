import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonRepository } from '../LessonRepository';
import { Lesson, LessonType } from '../../domain/Lesson';

/**
 * In-memory Prisma stand-in: two spaces, each with one chapter and one lesson.
 *   space 1 → chapter 10 → lesson 100 (attacker's)
 *   space 2 → chapter 20 → lesson 200 (victim's)
 */
function makePrisma() {
    const chapters = [
        { id: BigInt(10), space_id: BigInt(1) },
        { id: BigInt(20), space_id: BigInt(2) },
    ];
    const lessons = [
        { id: BigInt(100), chapter_id: BigInt(10) },
        { id: BigInt(200), chapter_id: BigInt(20) },
    ];
    const tx = {
        chapters: {
            findMany: vi.fn(async ({ where }: any) =>
                chapters.filter(c => c.space_id === where.space_id).map(c => ({ id: c.id }))),
        },
        lessons: {
            findMany: vi.fn(async ({ where }: any) =>
                lessons
                    .filter(l => where.id.in.includes(l.id) && where.chapter_id.in.includes(l.chapter_id))
                    .map(l => ({ id: l.id }))),
            deleteMany: vi.fn(async () => ({ count: 0 })),
            updateMany: vi.fn(async () => ({ count: 1 })),
            createMany: vi.fn(async () => ({ count: 1 })),
        },
    };
    const prisma = { $transaction: vi.fn(async (fn: any) => fn(tx)), _tx: tx };
    return prisma;
}

const mk = (id: bigint | null, chapterId: bigint) =>
    new Lesson(id, chapterId, 'T', LessonType.VIDEO, 'https://example.com', 0);

describe('LessonRepository.syncLessons — payload ids must belong to the space', () => {
    let prisma: ReturnType<typeof makePrisma>;
    let repo: LessonRepository;
    beforeEach(() => {
        prisma = makePrisma();
        repo = new LessonRepository(prisma as any);
    });

    it('rejects a lesson id from another space before writing anything', async () => {
        await expect(repo.syncLessons(BigInt(1), [mk(BigInt(200), BigInt(10))]))
            .rejects.toThrow('LESSON_NOT_IN_SPACE');
        expect(prisma._tx.lessons.deleteMany).not.toHaveBeenCalled();
        expect(prisma._tx.lessons.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a chapter id from another space before writing anything', async () => {
        await expect(repo.syncLessons(BigInt(1), [mk(null, BigInt(20))]))
            .rejects.toThrow('CHAPTER_NOT_IN_SPACE');
        expect(prisma._tx.lessons.deleteMany).not.toHaveBeenCalled();
        expect(prisma._tx.lessons.createMany).not.toHaveBeenCalled();
    });

    it('accepts a payload whose ids all belong to the space', async () => {
        await repo.syncLessons(BigInt(1), [mk(BigInt(100), BigInt(10)), mk(null, BigInt(10))]);
        expect(prisma._tx.lessons.deleteMany).toHaveBeenCalledTimes(1);
        expect(prisma._tx.lessons.updateMany).toHaveBeenCalledTimes(1);
        expect(prisma._tx.lessons.createMany).toHaveBeenCalledTimes(1);
    });
});
