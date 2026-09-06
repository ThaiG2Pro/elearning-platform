import ExcelJS from 'exceljs';

export interface RawExcelRow {
    [key: string]: any;
}

/**
 * Reads the FIRST worksheet of an .xlsx workbook into header-keyed objects.
 *
 * Backed by `exceljs` (replaced SheetJS `xlsx` 0.18.5, whose npm build carries
 * unpatched prototype-pollution + ReDoS advisories). Only `.xlsx` (OOXML) is
 * supported; legacy binary `.xls` is not.
 */
export class ExcelAdapter {
    static readonly MAX_ROWS = 5_000;

    async readToObjects(file: Buffer): Promise<RawExcelRow[]> {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(file as unknown as ArrayBuffer);

            // Only the first sheet is ever read. A workbook with the real
            // question data on a later sheet (e.g. a template with an
            // "Instructions" sheet placed first) parses as empty with no
            // indication other sheets were ignored — noted here since it's
            // not obvious from the call sites.
            const worksheet = workbook.worksheets[0];
            if (!worksheet) return [];

            const headerRow = worksheet.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
                headers[col - 1] = normalizeCell(cell.value);
            });
            if (headers.length === 0) return [];

            const rows: RawExcelRow[] = [];
            const lastRow = Math.min(worksheet.rowCount, ExcelAdapter.MAX_ROWS + 1);
            for (let r = 2; r <= lastRow; r++) {
                const row = worksheet.getRow(r);
                const obj: RawExcelRow = {};
                let hasValue = false;
                headers.forEach((header, index) => {
                    const value = normalizeCell(row.getCell(index + 1).value);
                    if (value !== '') hasValue = true;
                    obj[header] = value;
                });
                // SheetJS skipped fully blank rows; keep that behaviour.
                if (hasValue) rows.push(obj);
            }
            return rows;
        } catch (error) {
            console.error('Error reading Excel file:', error);
            throw new Error('INVALID_EXCEL_FILE');
        }
    }
}

/** Collapse exceljs' cell value union to the primitive-ish shape callers expect. */
function normalizeCell(value: ExcelJS.CellValue): any {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value === 0 ? '' : value; // SheetJS path used `row[i] || ''`
    }
    if (value instanceof Date) return value;
    if (typeof value === 'object') {
        if ('richText' in value) return value.richText.map((t) => t.text).join('');
        if ('text' in value && typeof value.text === 'string') return value.text; // hyperlink
        if ('result' in value) return normalizeCell(value.result as ExcelJS.CellValue); // formula
        if ('error' in value) return '';
    }
    return String(value);
}
