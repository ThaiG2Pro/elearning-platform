import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../modules/course-management/controllers/QuizController';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are allowed' }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const controller = new QuizController();
        const parsedQuestions = await controller.parseQuizFile(buffer);

        return NextResponse.json({
            success: true,
            data: parsedQuestions,
            count: parsedQuestions.length
        });
    } catch (error: any) {
        console.error('Error parsing quiz file:', error);

        if (error.name === 'ExcelInvalidException') {
            return NextResponse.json({
                error: 'Invalid Excel format',
                details: error.message,
                row: error.rowNumber
            }, { status: 400 });
        }

        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
