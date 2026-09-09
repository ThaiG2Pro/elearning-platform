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
            { id: 1n, ownerId: 10n, ownerName: 'Alice', status: 'ACTIVE' },
        ]);

        await expect(service.getCompanions(1n, 99n)).rejects.toThrow('FORBIDDEN');
    });

    it('returns empty when the caller is the only member of the lineage', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice', status: 'ACTIVE' },
        ]);

        const result = await service.getCompanions(1n, 10n);
        expect(result).toEqual([]);
        expect(learnService.getSpaceProgress).not.toHaveBeenCalled();
    });

    it('returns every lineage member with their own progress, sorted by completion desc', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice', status: 'ACTIVE' },
            { id: 2n, ownerId: 20n, ownerName: 'Bob', status: 'ACTIVE' },
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

    // 2026-09-07 — privacy fix: ai archive clone của mình thì không còn muốn
    // lộ tên + % cho người khác trong lineage nữa (xem docs/research/
    // space-lifecycle-clone-archive-audit.md mục 5).
    it('excludes ARCHIVED members from the visible companions list', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice', status: 'ACTIVE' },
            { id: 2n, ownerId: 20n, ownerName: 'Bob', status: 'ARCHIVED' },
        ]);
        learnService.getSpaceProgress.mockResolvedValue({ completionRate: 40, finishedLessons: 2, totalLessons: 5 });

        const result = await service.getCompanions(1n, 10n);

        // Chỉ còn Alice (đang active) — Bob đã archive nên không hiện ra dù
        // vẫn thuộc lineage. Vì chỉ còn 1 người active, coi như "solo".
        expect(result).toEqual([]);
        expect(learnService.getSpaceProgress).not.toHaveBeenCalled();
    });

    it('still allows an ARCHIVED member themself to open companions (isMember check ignores status)', async () => {
        spaceRepo.findLineageSpaces.mockResolvedValue([
            { id: 1n, ownerId: 10n, ownerName: 'Alice', status: 'ACTIVE' },
            { id: 2n, ownerId: 20n, ownerName: 'Bob', status: 'ARCHIVED' },
        ]);

        // Bob (đã archive) vẫn được xem trang companions — chỉ là kết quả trả
        // về không có ai (Alice không thấy Bob, Bob nhìn vào cũng chỉ thấy 1
        // người active còn lại nên bị coi là "solo").
        await expect(service.getCompanions(1n, 20n)).resolves.toEqual([]);
    });
});
