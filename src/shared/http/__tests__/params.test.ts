import { describe, it, expect } from 'vitest';
import { parseIdParam } from '../params';

describe('parseIdParam', () => {
    it('parses a plain integer string to a bigint', () => {
        expect(parseIdParam('42')).toBe(42n);
        expect(parseIdParam('0')).toBe(0n);
    });

    it('rejects a decimal string that Number() would accept but BigInt() throws on', () => {
        expect(parseIdParam('1.5')).toBeNull();
    });

    it('rejects scientific-notation, hex, and whitespace-padded strings', () => {
        expect(parseIdParam('1e10')).toBeNull();
        expect(parseIdParam('0x10')).toBeNull();
        expect(parseIdParam(' 1')).toBeNull();
        expect(parseIdParam('1 ')).toBeNull();
    });

    it('rejects a negative number string', () => {
        expect(parseIdParam('-1')).toBeNull();
    });

    it('rejects empty, undefined and null', () => {
        expect(parseIdParam('')).toBeNull();
        expect(parseIdParam(undefined)).toBeNull();
        expect(parseIdParam(null)).toBeNull();
    });
});
