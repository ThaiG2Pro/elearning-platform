import { PrismaClient } from '@prisma/client';
import { Course, CourseStatus } from '../domain/Course';
import { Chapter } from '../domain/Chapter';
import { Lesson } from '../domain/Lesson';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export class CourseRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: bigint): Promise<Course | null> {
        const course = await this.prisma.courses.findUnique({
            where: { id },
        });
        if (!course) return null;
        return new Course(
            course.id,
            course.lecturer_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
            course.reject_note,
            course.submitted_at || undefined
        );
    }

    async findActiveById(id: bigint): Promise<Course | null> {
        const course = await this.prisma.courses.findFirst({
            where: {
                id,
                status: 'ACTIVE',
            },
        });
        if (!course) return null;
        return new Course(
            course.id,
            course.lecturer_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
            course.reject_note,
            course.submitted_at || undefined
        );
    }

    async findByIdWithFullStructure(id: bigint): Promise<any> {
        const course = await this.prisma.courses.findUnique({
            where: { id },
            include: {
                lecturer: {
                    select: { full_name: true },
                },
                chapters: {
                    include: {
                        lessons: true,
                    },
                    orderBy: { order_index: 'asc' },
                },
            },
        });

        if (!course) return null;

        const chapters = course.chapters.map(chapter => {
            const lessons = chapter.lessons.map(lesson =>
                new Lesson(
                    lesson.id,
                    lesson.chapter_id,
                    lesson.title,
                    lesson.type as any,
                    lesson.content_url || '',
                    lesson.order_index
                )
            );
            return new Chapter(
                chapter.id,
                chapter.course_id,
                chapter.title,
                chapter.order_index,
                lessons
            );
        });

        return {
            id: course.id,
            lecturerId: course.lecturer_id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            status: course.status as CourseStatus,
            rejectNote: course.reject_note,
            submittedAt: course.submitted_at || undefined,
            lecturerName: course.lecturer.full_name,
            chapters
        };
    }

    async findActiveCoursesWithThumbnails(search?: string): Promise<{ id: bigint; title: string; slug: string; description: string | null; thumbnailUrl: string }[]> {
        const where: any = {
            status: 'ACTIVE',
        };

        if (search) {
            where.title = {
                contains: search,
                mode: 'insensitive',
            };
        }

        const courses = await this.prisma.courses.findMany({
            where,
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
            },
            orderBy: { id: 'desc' },
        });

        // Get thumbnail URLs for each course
        const coursesWithThumbnails = await Promise.all(
            courses.map(async (course) => {
                const thumbnailUrl = await this.getCourseThumbnailUrl(course.id);
                return {
                    ...course,
                    thumbnailUrl,
                };
            })
        );

        return coursesWithThumbnails;
    }

    private async getCourseThumbnailUrl(courseId: bigint): Promise<string> {
        try {
            const course = await this.prisma.courses.findUnique({
                where: { id: courseId },
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

            if (!course) {
                return '/images/course-placeholder.svg';
            }

            // Find first video URL
            const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(course.chapters);
            if (firstVideoUrl) {
                return VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl);
            }

            return '/images/course-placeholder.svg';
        } catch (error) {
            console.warn('Error getting course thumbnail:', error);
            return '/images/course-placeholder.svg';
        }
    }

    async save(course: Course): Promise<void> {
        if (!course.id) throw new Error('Course ID is required for update');
        await this.prisma.courses.update({
            where: { id: course.id },
            data: {
                title: course.title,
                slug: course.slug,
                description: course.description,
                status: course.status,
                reject_note: course.rejectNote,
            },
        });
    }

    async findPendingCourses(): Promise<{ id: bigint; title: string; lecturerName: string; submittedAt: Date }[]> {
        const courses = await this.prisma.courses.findMany({
            where: { status: 'PENDING' },
            include: {
                lecturer: {
                    select: { full_name: true }
                }
            },
            orderBy: { submitted_at: 'asc' } // FIFO: First submitted first
        });

        return courses.map(course => ({
            id: course.id,
            title: course.title,
            lecturerName: course.lecturer.full_name,
            submittedAt: course.submitted_at || new Date()
        }));
    }

    async findByIdWithLecturer(id: bigint): Promise<{ course: Course; lecturerName: string } | null> {
        const course = await this.prisma.courses.findUnique({
            where: { id },
            include: {
                lecturer: {
                    select: { full_name: true },
                },
                chapters: {
                    include: {
                        lessons: true,
                    },
                    orderBy: { order_index: 'asc' },
                },
            },
        });

        if (!course) return null;

        const chapters = course.chapters.map(chapter => {
            const lessons = chapter.lessons.map(lesson =>
                new Lesson(
                    lesson.id,
                    lesson.chapter_id,
                    lesson.title,
                    lesson.type as any,
                    lesson.content_url || '',
                    lesson.order_index
                )
            );
            return new Chapter(
                chapter.id,
                chapter.course_id,
                chapter.title,
                chapter.order_index,
                lessons
            );
        });

        const courseEntity = new Course(
            course.id,
            course.lecturer_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
            course.reject_note,
            course.submitted_at || undefined,
            chapters
        );

        return {
            course: courseEntity,
            lecturerName: course.lecturer?.full_name || '',
        };
    }
}
