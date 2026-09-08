/**
 * Security (2026-09-08) — route handlers across the app share this pattern:
 *
 *   const message = error instanceof Error ? error.message : 'Internal server error';
 *   const status = message === 'SOME_KNOWN_CODE' ? 404 : ...: 500;
 *   return NextResponse.json({ error: message }, { status });
 *
 * The domain layer throws plain `Error`s whose `message` is an intentional,
 * short error CODE (e.g. 'ACCESS_DENIED', 'LESSON_NOT_FOUND') — safe to
 * echo back, and already relied on by the frontend for i18n/branching. But
 * when `message` doesn't match any known code, `status` falls through to
 * the 500 default and the code above still echoes the raw `error.message`
 * verbatim — which, for an *unexpected* exception (a Prisma/driver error, a
 * stray TypeError, …), can leak internal details (SQL fragments, file
 * paths, library internals) to the client.
 *
 * `safeErrorMessage` is the one-line fix applied at every such call site:
 * once `status` has already been computed, only pass `message` through for
 * the statuses that mean "yes, this is a recognized, intentionally-named
 * error code"; for the unmapped/500 case, return a generic message instead.
 */
export function safeErrorMessage(message: string, status: number): string {
    return status === 500 ? 'Internal server error' : message;
}
