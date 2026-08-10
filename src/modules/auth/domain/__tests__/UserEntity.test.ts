import { describe, it, expect } from 'vitest';
import { UserEntity } from '../UserEntity';

const makeUser = (status = 'ACTIVE') =>
    new UserEntity(1n, 'user@test.com', '$2a$10$hash', status, 2, 'STUDENT', 'Test User', 22);

describe('UserEntity', () => {
    describe('isActive', () => {
        it('returns true when status is ACTIVE', () => {
            expect(makeUser('ACTIVE').isActive()).toBe(true);
        });

        it('returns false when status is INACTIVE', () => {
            expect(makeUser('INACTIVE').isActive()).toBe(false);
        });
    });

    describe('activate', () => {
        it('sets status to ACTIVE', () => {
            const user = makeUser('INACTIVE');
            user.activate();
            expect(user.status).toBe('ACTIVE');
            expect(user.isActive()).toBe(true);
        });
    });

    describe('markDeleted', () => {
        it('sets status to DELETED, distinct from INACTIVE', () => {
            const user = makeUser('ACTIVE');
            user.markDeleted();
            expect(user.status).toBe('DELETED');
            expect(user.status).not.toBe('INACTIVE');
        });

        it('makes isActive() return false', () => {
            const user = makeUser('ACTIVE');
            user.markDeleted();
            expect(user.isActive()).toBe(false);
        });
    });

    describe('updateAvatar', () => {
        it('sets avatarUrl', () => {
            const user = makeUser();
            user.updateAvatar('data:image/jpeg;base64,abc123');
            expect(user.avatarUrl).toBe('data:image/jpeg;base64,abc123');
        });
    });

    describe('updateProfile', () => {
        it('updates fullName and age', () => {
            const user = makeUser();
            user.updateProfile('New Name', 30);
            expect(user.fullName).toBe('New Name');
            expect(user.age).toBe(30);
        });

        it('updates fullName without age', () => {
            const user = makeUser();
            user.updateProfile('Only Name');
            expect(user.fullName).toBe('Only Name');
            expect(user.age).toBeUndefined();
        });
    });

    describe('matchPassword', () => {
        it('returns false for a hash that does not match', async () => {
            const user = makeUser();
            const result = await user.matchPassword('wrong-password');
            expect(result).toBe(false);
        });
    });

    describe('changePassword', () => {
        it('updates passwordHash to a bcrypt hash', async () => {
            const user = makeUser();
            const oldHash = user.passwordHash;
            await user.changePassword('new-secure-password');
            expect(user.passwordHash).not.toBe(oldHash);
            expect(user.passwordHash).toMatch(/^\$2[ab]\$/);
        });

        it('new hash verifies against new password', async () => {
            const user = makeUser();
            await user.changePassword('my-new-pass');
            const match = await user.matchPassword('my-new-pass');
            expect(match).toBe(true);
        });
    });
});
