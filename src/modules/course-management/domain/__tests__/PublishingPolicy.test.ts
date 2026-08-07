import { describe, it, expect } from 'vitest';
import { PublishingPolicy } from '../PublishingPolicy';

describe('PublishingPolicy', () => {
    describe('validateDeletionEligibility', () => {
        it('passes when more than one section exists', () => {
            expect(() => PublishingPolicy.validateDeletionEligibility(3)).not.toThrow();
        });

        it('throws CANNOT_DELETE_LAST_SECTION when only one section remains', () => {
            expect(() => PublishingPolicy.validateDeletionEligibility(1)).toThrow('CANNOT_DELETE_LAST_SECTION');
        });
    });
});
