import { PrismaClient } from '@prisma/client';
import { EnrolledCourseDto } from '../dtos/EnrolledCourseDto';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

// WP1.6.3 — findByStudentAndCourse/findByStudent/findById/save (reads/writes
// of the legacy `enrollments` table) were removed along with their only
// callers: EnrollmentService.enrollStudent/checkEnrollmentStatus (zero UI
// usage) and LessonController.getVideoContext (an orphaned route that
// 403'd everyone, since nothing creates `enrollments` rows anymore). Only
// getEnrolledCoursesWithDetails remains — it now reads owned courses
// directly instead of the `enrollments` table. The `enrollments` table
// itself and `learning_progress.enrollment_id` have since been dropped
// entirely (WP1.6 follow-up cleanup) — both were confirmed empty.
export class EnrollmentRepository {
    constructor(private prisma: PrismaClient) { }

    // WP1.6.2 — this used to read the legacy `enrollments` table
    // (student_id/completion_rate/enrolled_at), which nothing has written to
    // since the ownership pivot (WP0.2): course access/learn/lessons are all
    // gated on owner_id now (see AccessControlPolicy), so `/my-learning` was
    // permanently empty even for users with real, owned courses. This now
    // mirrors ContentManagementService.getLecturerCourses' owner_id query
    // and computes progress from `learning_progress` the same way
    // LearnService.getCourseProgress does for course-detail — one definition
    // of "done" across the app instead of two disconnected ones.
    async getEnrolledCoursesWithDetails(userId: bigint, filter?: string | null, sort?: string | null): Promise<EnrolledCourseDto[]> {
        let orderBy: any = { created_at: 'desc' };
        if (sort === 'enrolled_at_asc') {
            orderBy = { created_at: 'asc' };
        }

        const courses = await this.prisma.courses.findMany({
            // WP1.6 follow-up — `lecturer_id` (dropped from the schema) was
            // always equal to `owner_id` on every write path; querying it too
            // was always a no-op OR.
            where: { owner_id: userId },
            orderBy,
            include: {
                chapters: {
                    orderBy: { order_index: 'asc' },
                    include: {
                        lessons: {
                            where: { content_url: { not: null } },
                            orderBy: { order_index: 'asc' },
                        },
                    },
                },
            },
        });

        if (courses.length === 0) return [];

        const lessonIdsByCourse = new Map<bigint, Set<bigint>>();
        const allLessonIds: bigint[] = [];
        for (const course of courses) {
            const ids = new Set<bigint>();
            for (const chapter of course.chapters) {
                for (const lesson of chapter.lessons) {
                    ids.add(lesson.id);
                    allLessonIds.push(lesson.id);
                }
            }
            lessonIdsByCourse.set(course.id, ids);
        }

        const finishedProgress = allLessonIds.length > 0
            ? await this.prisma.learning_progress.findMany({
                where: { user_id: userId, lesson_id: { in: allLessonIds }, is_finished: true },
                select: { lesson_id: true },
            })
            : [];
        const finishedLessonIds = new Set(finishedProgress.map(p => p.lesson_id));

        const results: EnrolledCourseDto[] = courses.map(course => {
            const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(course.chapters);
            const thumbnailUrl = firstVideoUrl
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl)
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBUaHVtYm5haWw8L3RleHQ+Cjwvc3ZnPg==';

            const lessonIds = lessonIdsByCourse.get(course.id)!;
            const totalLessons = lessonIds.size;
            let finishedLessons = 0;
            for (const id of lessonIds) {
                if (finishedLessonIds.has(id)) finishedLessons++;
            }
            const completionRate = totalLessons > 0 ? Math.round((finishedLessons / totalLessons) * 100) : 0;
            const status = completionRate >= 100 ? 'completed' : 'in_progress';

            return {
                id: Number(course.id),
                title: course.title,
                slug: course.slug,
                status,
                thumbnailUrl,
                completionRate,
                enrolledAt: course.created_at,
            };
        });

        if (filter === 'in_progress') return results.filter(r => r.status !== 'completed');
        if (filter === 'completed') return results.filter(r => r.status === 'completed');
        return results;
    }
}
