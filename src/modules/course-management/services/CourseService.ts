import { CourseRepository } from '../repositories/CourseRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { CourseListDto } from '../dtos/CourseListDto';
import { CourseDetailDto, ChapterDto, LessonDto } from '../dtos/CourseDetailDto';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export class CourseService {
    constructor(
        private courseRepository: CourseRepository,
        private enrollmentRepository?: EnrollmentRepository
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
            throw new Error('Course not found');
        }

        let isEnrolled = false;
        if (userId && this.enrollmentRepository) {
            const enrollment = await this.enrollmentRepository.findByStudentAndCourse(userId, courseId);
            isEnrolled = enrollment !== null;
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
                lessons
            );
        });

        return new CourseDetailDto(
            Number(fullCourse.id),
            fullCourse.title,
            fullCourse.slug,
            fullCourse.description,
            fullCourse.lecturerName,
            isEnrolled,
            chapters,
            VideoThumbnailUtil.findFirstVideoUrl(fullCourse.chapters)
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(
                    VideoThumbnailUtil.findFirstVideoUrl(fullCourse.chapters)!
                )
                : '/images/course-placeholder.svg'
        );
    }
}
