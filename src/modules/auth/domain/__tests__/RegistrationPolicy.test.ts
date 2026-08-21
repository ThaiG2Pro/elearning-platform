import { describe, it, expect } from 'vitest';
import { RegistrationPolicy } from '../RegistrationPolicy';
import { UserEntity } from '../UserEntity';

const makeUser = (status: string) =>
    new UserEntity(1n, 'test@test.com', 'hash', status, 'STUDENT', 'Test User');

describe('RegistrationPolicy', () => {
    describe('validateRegistrationEligibility', () => {
        it('returns ALLOW_NEW when user does not exist', () => {
            expect(RegistrationPolicy.validateRegistrationEligibility(null)).toBe('ALLOW_NEW');
        });

        it('returns OVERWRITE when user is INACTIVE', () => {
            const user = makeUser('INACTIVE');
            expect(RegistrationPolicy.validateRegistrationEligibility(user)).toBe('OVERWRITE');
        });

        it('returns REJECT when user is ACTIVE', () => {
            const user = makeUser('ACTIVE');
            expect(RegistrationPolicy.validateRegistrationEligibility(user)).toBe('REJECT');
        });

        it('returns REJECT for any status other than INACTIVE', () => {
            const user = makeUser('SUSPENDED');
            expect(RegistrationPolicy.validateRegistrationEligibility(user)).toBe('REJECT');
        });
    });
});
