import { describe, it, expect, vi } from 'vitest';
import { QuizService } from '../QuizService';

// lesson 7 lives in space 1 owned by user 1
function makeService() {
    const prisma = {
        lessons: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === BigInt(7)
                    ? { id: BigInt(7), chapter: { space: { id: BigInt(1), owner_id: BigInt(1) } } }
                    : null),
        },
    };
    const questionRepo = {
        findRandomByLesson: vi.fn(async () => [{ id: BigInt(1), content: 'q', options: ['a', 'b'] }]),
        findByIds: vi.fn(async () => []),
    };
    const progressRepo = {
        findByStudentAndLesson: vi.fn(async () => null),
        save: vi.fn(async (p: any) => p),
    };
    return { service: new QuizService(questionRepo as any, progressRepo as any, prisma as any), progressRepo, questionRepo };
}

describe('QuizService — quiz routes require lesson ownership', () => {
    it('startQuiz refuses a non-owner and writes no progress', async () => {
        const { service, progressRepo } = makeService();
        await expect(service.startQuiz(BigInt(2), BigInt(7))).rejects.toThrow('ACCESS_DENIED');
        expect(progressRepo.save).not.toHaveBeenCalled();
    });

    it('submitQuiz refuses a non-owner before reading any answer', async () => {
        const { service, questionRepo } = makeService();
        await expect(service.submitQuiz(BigInt(2), BigInt(7), { answers: {} })).rejects.toThrow('ACCESS_DENIED');
        expect(questionRepo.findByIds).not.toHaveBeenCalled();
    });

    it('assertLessonAccess reports LESSON_NOT_FOUND for unknown lessons', async () => {
        const { service } = makeService();
        await expect(service.assertLessonAccess(BigInt(1), BigInt(999))).rejects.toThrow('LESSON_NOT_FOUND');
    });

    it('startQuiz lets the owner through and persists progress', async () => {
        const { service, progressRepo } = makeService();
        await service.startQuiz(BigInt(1), BigInt(7));
        expect(progressRepo.save).toHaveBeenCalledTimes(1);
    });
});
