/**
 * Single source of truth for the JWT signing secret.
 *
 * Fail-closed on purpose: a missing/placeholder secret used to fall back to
 * the literal string 'secret' in the verify path, which would have accepted
 * any token an attacker signed with that string. Both signing
 * (TokenFactory) and verifying (shared/middleware/auth) now go through here,
 * so a misconfigured deployment refuses every token instead of accepting
 * forged ones.
 */
const PLACEHOLDER_SECRETS = new Set(['secret', 'your_jwt_secret_key_here', 'changeme']);
const MIN_SECRET_LENGTH = 32;

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || PLACEHOLDER_SECRETS.has(secret)) {
        throw new Error('JWT_SECRET not properly configured');
    }
    if (process.env.NODE_ENV === 'production' && secret.length < MIN_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET too short (min ${MIN_SECRET_LENGTH} chars in production)`);
    }
    return secret;
}
