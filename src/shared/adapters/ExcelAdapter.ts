import * as XLSX from 'xlsx';

export interface RawExcelRow {
    [key: string]: any;
}

export class ExcelAdapter {
    async readToObjects(file: Buffer): Promise<RawExcelRow[]> {
        try {
            const workbook = XLSX.read(file, {
                type: 'buffer',
                cellDates: true, // Tự động chuyển đổi format ngày tháng
                cellNF: false,
                cellText: false
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
            }) as any[][];

            // Skip header row and convert to objects
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1);

            return rows.map(row => {
                const obj: RawExcelRow = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
        } catch (error) {
            console.error('Error reading Excel file:', error);
            throw new Error('INVALID_EXCEL_FILE');
        }
    }
}
