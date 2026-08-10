import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OwnedCoursesService } from '../OwnedCoursesService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makeOwnedCoursesRepo = () => ({
    getOwnedCoursesWithDetails: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
// WP1.6.3 — enrollStudent/checkEnrollmentStatus were removed (zero UI
// callers, dead since the ownership pivot); only getOwnedCoursesWithProgress remains.

describe('OwnedCoursesService — integration (mocked repos)', () => {
    let ownedCoursesRepo: ReturnType<typeof makeOwnedCoursesRepo>;
    let service: OwnedCoursesService;

    beforeEach(() => {
        ownedCoursesRepo = makeOwnedCoursesRepo();
        service = new OwnedCoursesService(ownedCoursesRepo as any);
    });

    describe('getOwnedCoursesWithProgress', () => {
        it('returns the list from the repository', async () => {
            const mockList = [{ id: 10n, title: 'Test Course' }];
            ownedCoursesRepo.getOwnedCoursesWithDetails.mockResolvedValue(mockList);

            const result = await service.getOwnedCoursesWithProgress(1n);
            expect(result).toEqual(mockList);
            expect(ownedCoursesRepo.getOwnedCoursesWithDetails).toHaveBeenCalledWith(1n, undefined, undefined);
        });

        it('passes filter and sort to the repository', async () => {
            ownedCoursesRepo.getOwnedCoursesWithDetails.mockResolvedValue([]);

            await service.getOwnedCoursesWithProgress(1n, 'in-progress', 'recent');
            expect(ownedCoursesRepo.getOwnedCoursesWithDetails).toHaveBeenCalledWith(1n, 'in-progress', 'recent');
        });
    });
});
