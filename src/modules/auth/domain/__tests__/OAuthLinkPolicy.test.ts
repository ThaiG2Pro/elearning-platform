import { describe, it, expect } from 'vitest';
import { OAuthLinkPolicy } from '../OAuthLinkPolicy';
import { UserEntity } from '../UserEntity';

const makeUser = (status = 'ACTIVE') =>
    new UserEntity(1n, 'user@test.com', '$2a$10$invalidhash', status, 'STUDENT', 'Test User', 25);

describe('OAuthLinkPolicy.resolve', () => {
    it('returns CREATE_NEW when no user matches by OAuth identity or email', () => {
        expect(OAuthLinkPolicy.resolve(null, null)).toBe('CREATE_NEW');
    });

    it('returns LINK_TO_EMAIL when an email match exists but no prior OAuth link', () => {
        expect(OAuthLinkPolicy.resolve(null, makeUser('ACTIVE'))).toBe('LINK_TO_EMAIL');
    });

    it('returns LINK_TO_EMAIL even when the matched email account is still INACTIVE', () => {
        expect(OAuthLinkPolicy.resolve(null, makeUser('INACTIVE'))).toBe('LINK_TO_EMAIL');
    });

    it('returns LOGIN_EXISTING_OAUTH when the OAuth identity is already linked, regardless of an email match', () => {
        const linked = makeUser('ACTIVE');
        expect(OAuthLinkPolicy.resolve(linked, makeUser('ACTIVE'))).toBe('LOGIN_EXISTING_OAUTH');
        expect(OAuthLinkPolicy.resolve(linked, null)).toBe('LOGIN_EXISTING_OAUTH');
    });
});
