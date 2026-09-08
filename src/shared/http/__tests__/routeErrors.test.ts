import { describe, it, expect } from 'vitest';
import { safeErrorMessage } from '../routeErrors';

describe('safeErrorMessage', () => {
    it('passes the message through for any recognized (non-500) status', () => {
        expect(safeErrorMessage('LESSON_NOT_FOUND', 404)).toBe('LESSON_NOT_FOUND');
        expect(safeErrorMessage('ACCESS_DENIED', 403)).toBe('ACCESS_DENIED');
        expect(safeErrorMessage('NOTE_EMPTY', 400)).toBe('NOTE_EMPTY');
    });

    it('replaces the message with a generic string for status 500', () => {
        expect(safeErrorMessage('Cannot read properties of undefined (reading \'x\')', 500))
            .toBe('Internal server error');
        expect(safeErrorMessage('relation "foo" does not exist', 500)).toBe('Internal server error');
    });
});
