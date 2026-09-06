import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { ExcelAdapter } from '../ExcelAdapter';

async function buildXlsx(rows: unknown[][], sheetName = 'Sheet1'): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    rows.forEach((r) => ws.addRow(r));
    return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('ExcelAdapter (exceljs)', () => {
    it('maps the first row to keys and skips blank rows', async () => {
        const buf = await buildXlsx([
            ['Question', 'A', 'B', 'CorrectAnswer'],
            ['1+1?', '2', '3', 'A'],
            [],
            ['Capital of VN?', 'Hanoi', 'Hue', 'A'],
        ]);
        const rows = await new ExcelAdapter().readToObjects(buf);
        expect(rows).toEqual([
            { Question: '1+1?', A: '2', B: '3', CorrectAnswer: 'A' },
            { Question: 'Capital of VN?', A: 'Hanoi', B: 'Hue', CorrectAnswer: 'A' },
        ]);
    });

    it('flattens rich text and hyperlink cells to plain strings, and fills empty cells with ""', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Q');
        ws.addRow(['Question', 'A', 'B']);
        const r = ws.addRow(['', '', '']);
        r.getCell(1).value = { richText: [{ text: 'Rich ' }, { text: 'text' }] };
        r.getCell(2).value = { text: 'link', hyperlink: 'https://example.com' };
        const buf = Buffer.from(await wb.xlsx.writeBuffer());
        const rows = await new ExcelAdapter().readToObjects(buf);
        expect(rows).toEqual([{ Question: 'Rich text', A: 'link', B: '' }]);
    });

    it('returns [] for a workbook whose first sheet is empty', async () => {
        const buf = await buildXlsx([]);
        expect(await new ExcelAdapter().readToObjects(buf)).toEqual([]);
    });

    it('throws INVALID_EXCEL_FILE for garbage bytes', async () => {
        await expect(new ExcelAdapter().readToObjects(Buffer.from('not a zip'))).rejects.toThrow('INVALID_EXCEL_FILE');
    });
});
