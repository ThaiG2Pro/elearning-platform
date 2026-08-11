import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getUserIdFromRequest } from '../../../../../../shared/middleware/auth';

// Sample rows deliberately exercise the full contract QuizValidationPolicy
// enforces, so a lecturer opening the template sees valid shapes rather than
// guessing: a 4-option row with the correct answer matched by exact option
// text, and a 2-option row with the correct answer given as a bare letter
// (QuizPolicy.resolveCorrectIndex's letter fallback — same format the seed
// data uses).
const SAMPLE_ROWS: [string, string, string][] = [
    ['Content', 'Options', 'CorrectAnswer'],
    ['Thủ đô của Việt Nam là gì?', 'Hà Nội|Hồ Chí Minh|Đà Nẵng|Huế', 'Hà Nội'],
    ['2 + 2 = ?', '3|4|5|6', '4'],
    ['Trái Đất có hình gì?', 'Hình vuông|Hình cầu', 'B'],
];

export async function GET(request: NextRequest) {
    try {
        // Consistent with the sibling /management/quiz/parse route — this
        // still sits under /management and there's no reason to make it the
        // one unauthenticated endpoint in the group.
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const worksheet = XLSX.utils.aoa_to_sheet(SAMPLE_ROWS);
        worksheet['!cols'] = [{ wch: 40 }, { wch: 45 }, { wch: 20 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Câu hỏi');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="mau-cau-hoi-quiz.xlsx"',
            },
        });
    } catch (error) {
        console.error('Error generating quiz template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
