import { describe, it, expect } from 'vitest';
import { UserEntity } from '../UserEntity';

const makeUser = (status = 'ACTIVE') =>
    new UserEntity(1n, 'user@test.com', '$2a$10$hash', status, 'STUDENT', 'Test User', 22);

describe('UserEntity', () => {
    describe('isActive', () => {
        it('returns false when status is INACTIVE', () => {
            expect(makeUser('INACTIVE').isActive()).toBe(false);
        });
    });

    describe('markDeleted', () => {
        it('makes isActive() return false', () => {
            const user = makeUser('ACTIVE');
            user.markDeleted();
            expect(user.isActive()).toBe(false);
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

        // Security fix: session invalidation — /auth/refresh dùng
        // passwordChangedAt để từ chối refresh token cũ hơn lần đổi mật
        // khẩu gần nhất.
        it('sets passwordChangedAt to now', async () => {
            const user = makeUser();
            expect(user.passwordChangedAt).toBeUndefined();
            const before = Date.now();
            await user.changePassword('new-secure-password');
            expect(user.passwordChangedAt).toBeInstanceOf(Date);
            expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before);
        });
    });
});
