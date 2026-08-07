import { describe, it, expect } from 'vitest';
import { AccessControlPolicy } from '../AccessControlPolicy';

describe('AccessControlPolicy', () => {
    describe('validateOwnership', () => {
        it('does not throw when userId matches ownerId', () => {
            expect(() => AccessControlPolicy.validateOwnership(42n, 42n)).not.toThrow();
        });

        it('throws ACCESS_DENIED when userId does not match ownerId', () => {
            expect(() => AccessControlPolicy.validateOwnership(1n, 99n)).toThrow('ACCESS_DENIED');
        });
    });
});
