import { NextRequest, NextResponse } from 'next/server';
import { CourseController } from '@/modules/course-management/controllers/CourseController';

/**
 * Public, no-auth view of a shared course — anonymous visitors following a
 * share link land here (WP1.4). Only ever returns ACTIVE courses; an
 * archived/unknown token reads as "not found", never a hint that the token
 * existed once.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const controller = new CourseController();
        const course = await controller.getCourseByShareToken(params.token);
        return NextResponse.json(course);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'SHARE_LINK_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        console.error('Get shared course error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
