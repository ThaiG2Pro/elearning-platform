import { describe, it, expect } from 'vitest';
import { assertMaxLength, FIELD_LIMITS } from '../fieldLimits';

describe('assertMaxLength', () => {
    it('allows a value exactly at the limit', () => {
        expect(() => assertMaxLength('a'.repeat(10), 10, 'TOO_LONG')).not.toThrow();
    });

    it('allows a value under the limit', () => {
        expect(() => assertMaxLength('a'.repeat(9), 10, 'TOO_LONG')).not.toThrow();
    });

    it('throws Error(errorCode) for a value over the limit', () => {
        expect(() => assertMaxLength('a'.repeat(11), 10, 'TOO_LONG')).toThrow('TOO_LONG');
    });
});

describe('FIELD_LIMITS', () => {
    it('matches the DB column limits (schema.prisma VarChar sizes)', () => {
        expect(FIELD_LIMITS.TITLE).toBe(255);
        expect(FIELD_LIMITS.FULL_NAME).toBe(100);
        expect(FIELD_LIMITS.URL).toBe(500);
    });
});
