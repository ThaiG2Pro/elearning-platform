import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpaceService } from '../SpaceService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makeSpaceRepo = () => ({
    findLineageSpaces: vi.fn(),
});

const makeLearnService = () => ({
    getSpaceProgress: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
// WP1.7 — "cùng học": companions view over a space's clone lineage.

describe('SpaceService.getCompanions', () => {
    let spaceRepo: ReturnType<typeof makeSpaceRepo>;
    let learnService: ReturnType<typeof makeLearnService>;
    let service: SpaceService;

    beforeEach(() => {
        spaceRepo = makeSpaceRepo();
        learnService = makeLearnService();
        service = new SpaceService(spaceRepo as any, learnService as any);
    });

    it('rejects a caller who is not a member of the lineage', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
        ]);

        await expect(service.getCompanions(1n, 99n)).rejects.toThrow('FORBIDDEN');
    });

    it('returns empty when the caller is the only member of the lineage', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
        ]);

        const result = await service.getCompanions(1n, 10n);
        expect(result).toEqual([]);
        expect(learnService.getSpaceProgress).not.toHaveBeenCalled();
    });

    it('returns every lineage member with their own progress, sorted by completion desc', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice' },
            { id: 2n, ownerId: 20n, ownerName: 'Bob' },
        ]);
        learnService.getSpaceProgress.mockImplementation(async (userId: bigint) =>
            userId === 10n
                ? { completionRate: 40, finishedLessons: 2, totalLessons: 5 }
                : { completionRate: 80, finishedLessons: 4, totalLessons: 5 }
        );

        const result = await service.getCompanions(1n, 10n);

        expect(result).toEqual([
            { spaceId: 2, name: 'Bob', completionRate: 80, isSelf: false },
            { spaceId: 1, name: 'Alice', completionRate: 40, isSelf: true },
        ]);
        expect(learnService.getSpaceProgress).toHaveBeenCalledWith(10n, 1n);
        expect(learnService.getSpaceProgress).toHaveBeenCalledWith(20n, 2n);
    });
});
