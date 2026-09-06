import { describe, it, expect } from 'vitest';
import { sanitizeRedirectPath } from '../safeRedirect';

describe('sanitizeRedirectPath', () => {
    it.each([
        '/',
        '/spaces/12/learn',
        '/spaces/12/learn?tab=quiz#q3',
        '/my-shares?tab=ai',
    ])('keeps a same-origin path: %s', (p) => {
        expect(sanitizeRedirectPath(p)).toBe(p);
    });

    it.each([
        'https://evil.example/',
        'http://evil.example',
        '//evil.example/x',
        '/\\evil.example',
        '/\\\\evil.example',
        'javascript:alert(1)',
        'evil.example',
        '/foo\r\nLocation: https://evil.example',
        '/foo\tbar',
        '',
        '   ',
        undefined,
        null,
        42,
        { toString: () => '/x' },
    ])('collapses unsafe value %j to the fallback', (p) => {
        expect(sanitizeRedirectPath(p)).toBe('/');
    });

    it('trims surrounding whitespace before validating (browsers do the same)', () => {
        expect(sanitizeRedirectPath('\n/foo ')).toBe('/foo');
    });

    it('honours a custom fallback', () => {
        expect(sanitizeRedirectPath('https://evil.example', '/home')).toBe('/home');
    });

    it('normalises path traversal against the origin without leaving it', () => {
        expect(sanitizeRedirectPath('/a/../b')).toBe('/b');
        expect(sanitizeRedirectPath('/../../evil')).toBe('/evil');
    });
});
