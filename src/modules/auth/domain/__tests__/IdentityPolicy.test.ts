import { describe, it, expect } from 'vitest';
import { IdentityPolicy } from '../IdentityPolicy';
import { NavigationAction } from '../NavigationAction';
import { UserEntity } from '../UserEntity';

const makeUser = (status: string) =>
    new UserEntity(1n, 'test@test.com', 'hash', status, 'STUDENT', 'Test User');

describe('IdentityPolicy', () => {
    describe('determineNextAction', () => {
        it('returns REGISTER when user does not exist', () => {
            expect(IdentityPolicy.determineNextAction(null)).toBe(NavigationAction.REGISTER);
        });

        it('returns LOGIN when user is ACTIVE', () => {
            const user = makeUser('ACTIVE');
            expect(IdentityPolicy.determineNextAction(user)).toBe(NavigationAction.LOGIN);
        });

        it('returns REGISTER when user is INACTIVE', () => {
            const user = makeUser('INACTIVE');
            expect(IdentityPolicy.determineNextAction(user)).toBe(NavigationAction.REGISTER);
        });
    });
});
