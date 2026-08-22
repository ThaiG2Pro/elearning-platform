import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';
import { prisma } from '@/shared/config/database';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!params.id || isNaN(Number(params.id))) {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }

        const spaceId = BigInt(params.id);
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const controller = new SpaceController();
        const space = await controller.getSpaceDetail(spaceId, userId);

        if (!space) {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }

        if (!space.isOwner) {
            return NextResponse.json(
                { error: 'ACCESS_DENIED' },
                { status: 403 }
            );
        }

        // Extract lessons from chapters
        const progressRepo = new (await import('@/modules/space-management/repositories/LearningProgressRepository')).LearningProgressRepository(prisma);

        const lessons = [] as any[];
        for (const chapter of space.chapters) {
            for (const lesson of chapter.lessons) {
                // Get progress for this lesson for the user
                const progress = await progressRepo.findByStudentAndLesson(userId, BigInt(lesson.id));
                const isCompleted = !!progress?.isFinished;

                // Duration: try lesson.duration if present, otherwise 0 (could be enhanced to fetch YouTube metadata)
                const duration = (lesson as any).duration || 0;

                lessons.push({
                    id: lesson.id.toString(),
                    title: lesson.title,
                    type: lesson.type,
                    order: lesson.orderIndex,
                    videoUrl: lesson.contentUrl,
                    isCompleted,
                    duration,
                    chapterId: chapter.id.toString(),
                    chapterTitle: chapter.title,
                    chapterOrder: chapter.orderIndex,
                    // WP2.3 — Source id để UI trigger AI generation.
                    sourceId: lesson.sourceId ? lesson.sourceId.toString() : null,
                });
            }
        }

        return NextResponse.json(lessons);
    } catch (error: any) {
        if (error?.message === 'SPACE_NOT_FOUND' || error?.message === 'Space not found') {
            return NextResponse.json(
                { error: 'SPACE_NOT_FOUND' },
                { status: 404 }
            );
        }
        console.error('Get space lessons error:', error);
        return NextResponse.json(
            { error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
