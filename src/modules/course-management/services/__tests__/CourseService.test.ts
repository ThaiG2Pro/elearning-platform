import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseService } from '../CourseService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makeCourseRepo = () => ({
    findLineageCourses: vi.fn(),
});

const makeLearnService = () => ({
    getCourseProgress: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
// WP1.7 — "cùng học": companions view over a course's clone lineage.

describe('CourseService.getCompanions', () => {
    let courseRepo: ReturnType<typeof makeCourseRepo>;
    let learnService: ReturnType<typeof makeLearnService>;
    let service: CourseService;

    beforeEach(() => {
        courseRepo = makeCourseRepo();
        learnService = makeLearnService();
        service = new CourseService(courseRepo as any, learnService as any);
    });

    it('rejects a caller who is not a member of the lineage', async () => {
        courseRepo.findLineageCourses.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
        ]);

        await expect(service.getCompanions(1n, 99n)).rejects.toThrow('FORBIDDEN');
    });

    it('returns empty when the caller is the only member of the lineage', async () => {
        courseRepo.findLineageCourses.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
        ]);

        const result = await service.getCompanions(1n, 10n);
        expect(result).toEqual([]);
        expect(learnService.getCourseProgress).not.toHaveBeenCalled();
    });

    it('returns every lineage member with their own progress, sorted by completion desc', async () => {
        courseRepo.findLineageCourses.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
            { id: 2n, ownerId: 20n, ownerName: 'Bob' },
        ]);
        learnService.getCourseProgress.mockImplementation(async (userId: bigint) =>
            userId === 10n
                ? { completionRate: 40, finishedLessons: 2, totalLessons: 5 }
                : { completionRate: 80, finishedLessons: 4, totalLessons: 5 }
        );

        const result = await service.getCompanions(1n, 10n);

        expect(result).toEqual([
            { courseId: 2, name: 'Bob', completionRate: 80, isSelf: false },
            { courseId: 1, name: 'Alice', completionRate: 40, isSelf: true },
        ]);
        expect(learnService.getCourseProgress).toHaveBeenCalledWith(10n, 1n);
        expect(learnService.getCourseProgress).toHaveBeenCalledWith(20n, 2n);
    });
});
