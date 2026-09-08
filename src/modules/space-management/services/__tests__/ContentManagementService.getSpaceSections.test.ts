import { describe, it, expect, vi } from 'vitest';
import { ContentManagementService } from '../ContentManagementService';
import { Space, SpaceStatus } from '../../domain/Space';

// Security fix (issue 13): GET/POST management/spaces/[id]/sections used to
// do their own ownership check with a raw prisma.spaces.findUnique + manual
// owner_id comparison, duplicated from (and able to drift out of sync with)
// the AccessControlPolicy check every other management route goes through.
// getSpaceSections now enforces ownership itself, the same way
// createSection already did.

const OWNER_ID = BigInt(1);
const OTHER_USER_ID = BigInt(2);
const SPACE_ID = BigInt(10);
const MISSING_SPACE_ID = BigInt(999);

function makeSpace() {
    return new Space(SPACE_ID, OWNER_ID, 'My space', 'my-space', null, SpaceStatus.ACTIVE, []);
}

function makeService() {
    const spaceRepository = {
        findById: vi.fn(async (id: bigint) => (id === SPACE_ID ? makeSpace() : null)),
    };
    const prisma = {
        chapters: {
            findMany: vi.fn(async () => []),
        },
    };
    return { service: new ContentManagementService(spaceRepository as any, prisma as any) };
}

describe('ContentManagementService.getSpaceSections — ownership', () => {
    it('throws SPACE_NOT_FOUND for a non-existent space', async () => {
        const { service } = makeService();
        await expect(service.getSpaceSections(OWNER_ID, MISSING_SPACE_ID))
            .rejects.toThrow('SPACE_NOT_FOUND');
    });

    it('throws ACCESS_DENIED for a non-owner', async () => {
        const { service } = makeService();
        await expect(service.getSpaceSections(OTHER_USER_ID, SPACE_ID))
            .rejects.toThrow('ACCESS_DENIED');
    });

    it('returns the space and sections for the owner', async () => {
        const { service } = makeService();
        const result = await service.getSpaceSections(OWNER_ID, SPACE_ID);
        expect(result.space.id).toBe(SPACE_ID);
        expect(result.sections).toEqual([]);
    });
});
