import { NextRequest, NextResponse } from 'next/server';
import { QuizController } from '../../../../../../../../modules/course-management/controllers/QuizController';
import { getUserFromRequest } from '../../../../../../../../shared/middleware/auth';

const controller = new QuizController();

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is lecturer/admin
        if (user.role !== 'LECTURER' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'ACCESS_DENIED', message: 'Lecturer or admin role required' }, { status: 403 });
        }

        const lessonId = BigInt(params.id);

        // Get file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'NO_FILE', message: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'Only Excel files (.xlsx, .xls) are allowed' }, { status: 400 });
        }

        // Convert file to buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Upload quiz questions (BR-UPLOAD-01: Replace all)
        const result = await controller.uploadQuizForLesson(lessonId, fileBuffer);

        return NextResponse.json({
            message: 'Quiz questions uploaded successfully',
            uploadedCount: result.uploadedCount
        });

    } catch (error) {
        console.error('Error uploading quiz:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
