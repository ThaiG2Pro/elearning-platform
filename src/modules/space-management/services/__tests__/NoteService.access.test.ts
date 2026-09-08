import { describe, it, expect, vi } from 'vitest';
import { NoteService } from '../NoteService';

// Security fix: addNote resolved the lesson's spaceId but never checked
// that spaceId belonged to the caller — any logged-in user could write a
// note onto someone else's lesson by guessing/incrementing a lessonId.
// lesson 7 lives in space 1 owned by user 1 (same fixture shape as
// QuizService.access.test.ts, which guards the equivalent gap there).
function makeService() {
    const prisma = {
        lessons: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === BigInt(7)
                    ? { id: BigInt(7), chapter: { space: { id: BigInt(1), owner_id: BigInt(1) } } }
                    : null),
        },
    };
    const noteRepo = {
        create: vi.fn(async (note: any) => ({ ...note, id: BigInt(1), createdAt: new Date(), updatedAt: new Date() })),
        findAllByUserAndLesson: vi.fn(async () => []),
        findById: vi.fn(async () => null),
        delete: vi.fn(async () => undefined),
    };
    return { service: new NoteService(noteRepo as any, prisma as any), noteRepo };
}

describe('NoteService.addNote — requires lesson ownership', () => {
    it('refuses a non-owner and writes no note', async () => {
        const { service, noteRepo } = makeService();
        await expect(service.addNote(BigInt(2), BigInt(7), 'hi', null)).rejects.toThrow('ACCESS_DENIED');
        expect(noteRepo.create).not.toHaveBeenCalled();
    });

    it('reports LESSON_NOT_FOUND for an unknown lesson', async () => {
        const { service } = makeService();
        await expect(service.addNote(BigInt(1), BigInt(999), 'hi', null)).rejects.toThrow('LESSON_NOT_FOUND');
    });

    it('lets the owner through and persists the note', async () => {
        const { service, noteRepo } = makeService();
        await service.addNote(BigInt(1), BigInt(7), 'hi', null);
        expect(noteRepo.create).toHaveBeenCalledTimes(1);
    });
});
