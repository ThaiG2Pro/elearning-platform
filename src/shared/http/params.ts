/**
 * Security (2026-09-08) — many routes guard a bigint route param with
 * `!params.id || isNaN(Number(params.id))` before calling `BigInt(params.id)`.
 * That guard is too loose: `Number('1.5')` is `1.5` (not NaN), so a value
 * like '1.5', '1e10' or ' 1' sails past the check and then makes
 * `BigInt(...)` throw a `SyntaxError` — caught by the route's try/catch,
 * but surfacing as an unintended 500 instead of the route's normal
 * "not found / invalid id" response. Several other routes call
 * `BigInt(params.id)` with no guard at all.
 *
 * `parseIdParam` replaces both patterns: it only accepts a plain
 * non-negative-integer string (what every id in this schema actually is —
 * `BigInt @id @default(autoincrement())`) and returns `null` for anything
 * else, so callers can react with their normal 400/404 branch instead of
 * risking a thrown exception.
 */
export function parseIdParam(raw: string | undefined | null): bigint | null {
    if (!raw || !/^\d+$/.test(raw)) return null;
    try {
        return BigInt(raw);
    } catch {
        return null;
    }
}
