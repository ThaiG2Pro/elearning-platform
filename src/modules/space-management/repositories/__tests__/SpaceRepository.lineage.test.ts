import { describe, it, expect, vi } from 'vitest';
import { SpaceRepository } from '../SpaceRepository';

describe('SpaceRepository.findLineageSpaces (Root Pointer Optimization)', () => {
    it('returns empty array when target space is not found', async () => {
        const mockPrisma = {
            spaces: {
                findUnique: vi.fn().mockResolvedValue(null),
                findMany: vi.fn(),
            },
        };
        const repo = new SpaceRepository(mockPrisma as any);

        const result = await repo.findLineageSpaces(999n);

        expect(result).toEqual([]);
        expect(mockPrisma.spaces.findMany).not.toHaveBeenCalled();
    });

    it('performs flat lookup using root_space_id when space is a clone', async () => {
        const mockPrisma = {
            spaces: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 2n,
                    root_space_id: 1n,
                    cloned_from_space_id: 1n,
                }),
                findMany: vi.fn().mockResolvedValue([
                    { id: 1n, owner_id: 10n, status: 'ACTIVE', owner: { full_name: 'Root Owner' } },
                    { id: 2n, owner_id: 20n, status: 'ACTIVE', owner: { full_name: 'Clone Owner' } },
                ]),
            },
        };
        const repo = new SpaceRepository(mockPrisma as any);

        const result = await repo.findLineageSpaces(2n);

        expect(mockPrisma.spaces.findUnique).toHaveBeenCalledWith({
            where: { id: 2n },
            select: { id: true, root_space_id: true, cloned_from_space_id: true },
        });

        expect(mockPrisma.spaces.findMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { id: 1n },
                    { root_space_id: 1n },
                ],
            },
            select: {
                id: true,
                owner_id: true,
                status: true,
                owner: { select: { full_name: true } },
            },
        });

        expect(result).toEqual([
            { id: 1n, ownerId: 10n, ownerName: 'Root Owner', status: 'ACTIVE' },
            { id: 2n, ownerId: 20n, ownerName: 'Clone Owner', status: 'ACTIVE' },
        ]);
    });

    it('treats space id as rootId when space is the root itself (root_space_id is null)', async () => {
        const mockPrisma = {
            spaces: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 1n,
                    root_space_id: null,
                    cloned_from_space_id: null,
                }),
                findMany: vi.fn().mockResolvedValue([
                    { id: 1n, owner_id: 10n, status: 'ACTIVE', owner: { full_name: 'Root Owner' } },
                ]),
            },
        };
        const repo = new SpaceRepository(mockPrisma as any);

        const result = await repo.findLineageSpaces(1n);

        expect(mockPrisma.spaces.findMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { id: 1n },
                    { root_space_id: 1n },
                ],
            },
            select: {
                id: true,
                owner_id: true,
                status: true,
                owner: { select: { full_name: true } },
            },
        });

        expect(result).toHaveLength(1);
    });
});
