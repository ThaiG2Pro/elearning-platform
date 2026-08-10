import { NextRequest, NextResponse } from 'next/server';
import { OwnedCoursesController } from '@/modules/course-management/controllers/OwnedCoursesController';
import { getUserFromRequest } from '@/shared/middleware/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter'); // 'in_progress' | 'completed' | null
        const sort = searchParams.get('sort'); // 'enrolled_at_desc' | null

        const controller = new OwnedCoursesController();
        const courses = await controller.getOwnedCoursesWithProgress(user.id, filter, sort);

        return NextResponse.json({ courses });
    } catch (error) {
        console.error('Error getting owned courses:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
