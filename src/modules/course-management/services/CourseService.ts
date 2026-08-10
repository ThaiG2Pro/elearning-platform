import { CourseRepository } from '../repositories/CourseRepository';
import { LearnService } from './LearnService';
import { CourseListDto } from '../dtos/CourseListDto';
import { CourseDetailDto, ChapterDto, LessonDto } from '../dtos/CourseDetailDto';
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
            course.thumbnailUrl
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
}
