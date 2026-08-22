import { describe, it, expect } from 'vitest';
import { Space, SpaceStatus } from '../Space';

const makeSpace = (status: SpaceStatus = SpaceStatus.ACTIVE) =>
    new Space(1n, 10n, 'Test Space', 'test-space', null, status);

describe('Space', () => {
    it('defaults to ACTIVE — no approval gate on creation', () => {
        const space = new Space(null, 10n, 'Title', 'slug', null);
        expect(space.status).toBe(SpaceStatus.ACTIVE);
    });

    describe('archive', () => {
        it('transitions ACTIVE → ARCHIVED', () => {
            const space = makeSpace(SpaceStatus.ACTIVE);
            space.archive();
            expect(space.status).toBe(SpaceStatus.ARCHIVED);
        });
    });

    describe('unarchive', () => {
        it('transitions ARCHIVED → ACTIVE', () => {
            const space = makeSpace(SpaceStatus.ARCHIVED);
            space.unarchive();
            expect(space.status).toBe(SpaceStatus.ACTIVE);
        });
    });
});
