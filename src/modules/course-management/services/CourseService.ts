import { CourseRepository } from '../repositories/CourseRepository';
import { LearnService } from './LearnService';
import { CourseListDto } from '../dtos/CourseListDto';
import { CourseDetailDto, ChapterDto, LessonDto } from '../dtos/CourseDetailDto';
import { CompanionDto } from '../dtos/CompanionDto';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export class CourseService {
    constructor(
        private courseRepository: CourseRepository,
        // WP1.6 follow-up — the dead `_enrollmentRepository` compatibility
        // param (never read since WP1.5.9's ownership-based access check)
        // was dropped entirely, along with the matching call-site arg in
        // CourseController.
        private learnService?: LearnService,
    ) { }

    async getCourses(search?: string): Promise<CourseListDto[]> {
        const courses = await this.courseRepository.findActiveCoursesWithThumbnails(search);

        return courses.map(course => new CourseListDto(
            Number(course.id),
            course.title,
            course.slug,
            course.description || '',
            course.thumbnailUrl,
            course.isShowcase,
            course.cloneCount,
        ));
    }

    async getCourseDetail(courseId: bigint, userId?: bigint): Promise<CourseDetailDto> {
        const fullCourse = await this.courseRepository.findByIdWithFullStructure(courseId);
        if (!fullCourse) {
            throw new Error('COURSE_NOT_FOUND');
        }

        // WP1.5.9 (found while fixing WP1.5.12): access here was still gated
        // by the legacy `enrollments` table, which WP0.2 was supposed to
        // remove from the main flow — a course's own owner has no enrollment
        // row, so GET /courses/[id]/lessons 403'd for literally every user,
        // including on their own course. Personal-organizer model: a course
        // is accessible to the user who owns it, full stop.
        const isOwner = !!userId && fullCourse.ownerId === userId;

        // WP1.3: surface the logged-in user's own progress on course-detail —
        // ownership-based, no enrollment required.
        let completionRate: number | undefined;
        if (userId && this.learnService) {
            const progress = await this.learnService.getCourseProgress(userId, courseId);
            completionRate = progress.completionRate;
        }

        const chapters = fullCourse.chapters.map((chapter: any) => {
            const lessons = chapter.lessons.map((lesson: any) => new LessonDto(
                Number(lesson.id),
                lesson.title,
                lesson.type,
                lesson.orderIndex,
                lesson.contentUrl
            ));
            return new ChapterDto(
                Number(chapter.id),
                chapter.title,
                lessons,
                chapter.orderIndex
            );
        });

        return new CourseDetailDto(
            Number(fullCourse.id),
            fullCourse.title,
            fullCourse.slug,
            fullCourse.description,
            fullCourse.ownerName,
            isOwner,
            chapters,
            VideoThumbnailUtil.findFirstVideoUrl(fullCourse.chapters)
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(
                    VideoThumbnailUtil.findFirstVideoUrl(fullCourse.chapters)!
                )
                : '/images/course-placeholder.svg',
            fullCourse.status,
            completionRate,
            fullCourse.shareToken || fullCourse.share_token || undefined,
        );
    }

    /**
     * WP1.7 — everyone sharing this course's clone lineage (owner-authored
     * root + every clone anyone made of it) with their own completion %.
     * Read-only, and only visible to a caller who is themself a member of
     * that lineage — this is not a public leaderboard.
     */
    async getCompanions(courseId: bigint, userId: bigint): Promise<CompanionDto[]> {
        const lineage = await this.courseRepository.findLineageCourses(courseId);
        const isMember = lineage.some(member => member.ownerId === userId);
        if (!isMember) {
            throw new Error('FORBIDDEN');
        }

        // Solo — no one else has cloned this course (or its root) yet.
        if (lineage.length <= 1 || !this.learnService) {
            return [];
        }

        const companions = await Promise.all(
            lineage.map(async (member) => {
                const progress = await this.learnService!.getCourseProgress(member.ownerId, member.id);
                return new CompanionDto(
                    Number(member.id),
                    member.ownerName,
                    progress.completionRate,
                    member.ownerId === userId,
                );
            })
        );

        return companions.sort((a, b) => b.completionRate - a.completionRate);
    }
}
