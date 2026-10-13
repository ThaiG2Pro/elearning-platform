import { describe, it, expect, vi } from 'vitest';
import { LearnService } from '../LearnService';

describe('LearnService.getBatchSpaceProgress', () => {
    it('returns empty Map immediately when spaceIds is empty', async () => {
        const mockPrisma = {
            $queryRaw: vi.fn(),
        };
        const mockRepo = {} as any;
        const service = new LearnService(mockRepo, mockPrisma as any);

        const result = await service.getBatchSpaceProgress([]);

        expect(result).toEqual(new Map());
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('executes SQL batch query and converts results into Map of completionRate', async () => {
        const mockPrisma = {
            $queryRaw: vi.fn().mockResolvedValue([
                { space_id: 1n, completion_rate: 45 },
                { space_id: 2n, completion_rate: 100 },
            ]),
        };
        const mockRepo = {} as any;
        const service = new LearnService(mockRepo, mockPrisma as any);

        const result = await service.getBatchSpaceProgress([1n, 2n]);

        expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        expect(result.get('1')).toBe(45);
        expect(result.get('2')).toBe(100);
        expect(result.get('999')).toBeUndefined();
    });
});
