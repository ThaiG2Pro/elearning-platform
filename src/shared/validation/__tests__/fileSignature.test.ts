import { describe, it, expect } from 'vitest';
import { hasXlsxMagicBytes } from '../fileSignature';

// Security fix: upload routes previously trusted `file.name.endsWith('.xlsx')`
// alone, a client-controlled string. These tests pin the magic-byte check
// that now runs before the file reaches the Excel parser.

function makeFile(bytes: number[], name = 'quiz.xlsx'): File {
    return new File([new Uint8Array(bytes)], name, { type: 'application/octet-stream' });
}

describe('hasXlsxMagicBytes', () => {
    it('accepts a real ZIP/OOXML header (PK\\x03\\x04)', async () => {
        const file = makeFile([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
        await expect(hasXlsxMagicBytes(file)).resolves.toBe(true);
    });

    it('rejects a file renamed to .xlsx but not actually a ZIP', async () => {
        const file = makeFile([0x25, 0x50, 0x44, 0x46]); // "%PDF"
        await expect(hasXlsxMagicBytes(file)).resolves.toBe(false);
    });

    it('rejects a plain-text file disguised as .xlsx', async () => {
        const file = makeFile(Array.from(Buffer.from('not an excel file')));
        await expect(hasXlsxMagicBytes(file)).resolves.toBe(false);
    });

    it('rejects an empty file', async () => {
        const file = makeFile([]);
        await expect(hasXlsxMagicBytes(file)).resolves.toBe(false);
    });

    it('rejects a file shorter than 4 bytes', async () => {
        const file = makeFile([0x50, 0x4b]);
        await expect(hasXlsxMagicBytes(file)).resolves.toBe(false);
    });
});
