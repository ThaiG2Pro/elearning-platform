/**
 * Open-redirect guard for `continueUrl` / `redirectUrl` values.
 *
 * Isomorphic (no server-only imports) so both API routes and client pages
 * can use the exact same rule. Only same-origin, path-only targets pass:
 *   ok  "/spaces/12/learn?x=1#top"
 *   no  "https://evil.example", "//evil.example", "/\\evil.example",
 *       "javascript:alert(1)", "\n/foo", "", non-strings
 * Anything else collapses to `fallback` ("/" by default).
 */
export function sanitizeRedirectPath(input: unknown, fallback: string = '/'): string {
    if (typeof input !== 'string') return fallback;
    const value = input.trim();
    if (value.length === 0 || value.length > 2048) return fallback;

    // Must be an absolute path on this origin; "//host" and "/\host" are
    // protocol-relative URLs in browsers, so the second char matters too.
    if (value[0] !== '/' || value[1] === '/' || value[1] === '\\') return fallback;
    if (value.includes('\\')) return fallback;
    // Control characters (incl. CR/LF/TAB) can smuggle a scheme past the checks above.
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1f\x7f]/.test(value)) return fallback;

    // Final authority: let the URL parser resolve it against a dummy origin
    // and confirm the origin did not change.
    try {
        const base = 'http://redirect.local';
        const parsed = new URL(value, base);
        if (parsed.origin !== base) return fallback;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return fallback;
    }
}
