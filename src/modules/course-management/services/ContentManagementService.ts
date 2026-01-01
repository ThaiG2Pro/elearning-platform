import { CourseRepository } from '../repositories/CourseRepository';
import { Course, CourseStatus } from '../domain/Course';
import { CreateCourseDto, CourseSummaryDto } from '../dtos/CourseManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto, LessonDto } from '../dtos/ContentDto';
import { PrismaClient } from '@prisma/client';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export interface ModerateCourseDto {
    action: 'APPROVE' | 'REJECT';
    rejectNote?: string;
}

export interface PendingCourseDto {
    id: bigint;
    title: string;
    lecturerName: string;
    submittedAt: Date;
}

export interface LessonPreviewDto {
    id: bigint;
    title: string;
    type: string;
    content: string;
    videoUrl?: string;
    quizQuestions?: any[];
}

export class ContentManagementService {
    constructor(
        private courseRepository: CourseRepository,
        private prisma: PrismaClient
    ) { }

    async getLecturerCourses(lecturerId: bigint, status?: string | null): Promise<CourseSummaryDto[]> {
        const whereClause: any = { lecturer_id: lecturerId };
        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const courses = await this.prisma.courses.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                status: true,
                reject_note: true,
                chapters: {
                    select: {
                        lessons: {
                            select: {
                                content_url: true,
                            },
                            where: {
                                content_url: { not: null },
                            },
                            orderBy: { order_index: 'asc' },
                        },
                    },
                    orderBy: { order_index: 'asc' },
                },
            },
            orderBy: { id: 'desc' },
        });

        return courses.map(course => {
            // Find the first video across all chapters and lessons
            const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(course.chapters);
            const thumbnailUrl = firstVideoUrl
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl)
                : '/images/course-placeholder.svg';

            return new CourseSummaryDto(
                course.id,
                course.title,
                course.status,
                thumbnailUrl,
                course.reject_note || undefined
            );
        });
    }

    async createCourse(lecturerId: bigint, dto: CreateCourseDto): Promise<bigint> {
        const course = new Course(
            null,
            lecturerId,
            dto.title,
            dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            dto.description || '',
            CourseStatus.DRAFT,
            null
        );

        await this.courseRepository.save(course);
        return course.id!;
    }

    async getCourseSections(courseId: bigint): Promise<SectionDto[]> {
        const sections = await this.prisma.chapters.findMany({
            where: { course_id: courseId },
            include: {
                lessons: {
                    orderBy: { order_index: 'asc' },
                },
            },
            orderBy: { order_index: 'asc' },
        });

        return sections.map(section => {
            const lessons = section.lessons.map(lesson => new LessonDto(
                lesson.id,
                lesson.title,
                lesson.type,
                lesson.order_index,
                lesson.content_url || undefined
            ));

            return new SectionDto(
                section.id,
                section.title,
                section.order_index,
                lessons
            );
        });
    }

    async createSection(courseId: bigint, dto: CreateSectionDto): Promise<bigint> {
        const section = await this.prisma.chapters.create({
            data: {
                course_id: courseId,
                title: dto.title,
                order_index: dto.orderIndex,
            },
        });
        return section.id;
    }

    async updateSection(sectionId: bigint, dto: UpdateSectionDto): Promise<void> {
        await this.prisma.chapters.update({
            where: { id: sectionId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.orderIndex !== undefined && { order_index: dto.orderIndex }),
            },
        });
    }

    async createLesson(sectionId: bigint, dto: CreateLessonDto): Promise<bigint> {
        const lesson = await this.prisma.lessons.create({
            data: {
                chapter_id: sectionId,
                title: dto.title,
                type: dto.type,
                content_url: dto.contentUrl,
                order_index: dto.orderIndex,
            },
        });
        return lesson.id;
    }

    async updateLesson(lessonId: bigint, dto: UpdateLessonDto): Promise<void> {
        await this.prisma.lessons.update({
            where: { id: lessonId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.contentUrl !== undefined && { content_url: dto.contentUrl }),
                ...(dto.orderIndex !== undefined && { order_index: dto.orderIndex }),
            },
        });
    }

    async deleteLesson(lessonId: bigint): Promise<void> {
        await this.prisma.lessons.delete({
            where: { id: lessonId },
        });
    }

    // Publishing & Moderation
    async submitForApproval(lecturerId: bigint, courseId: bigint): Promise<void> {
        // Check ownership
        const course = await this.prisma.courses.findFirst({
            where: { id: courseId, lecturer_id: lecturerId },
            include: {
                chapters: {
                    include: { lessons: true }
                }
            }
        });

        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        if (course.status !== 'DRAFT') {
            throw new Error('INVALID_STATUS');
        }

        // Validate minimum viable content (Rule 40)
        if (!course.title || !course.description || course.chapters.length === 0) {
            throw new Error('INCOMPLETE_CONTENT');
        }

        for (const chapter of course.chapters) {
            if (chapter.lessons.length === 0) {
                throw new Error('INCOMPLETE_CONTENT');
            }
            for (const lesson of chapter.lessons) {
                if (!lesson.content_url && lesson.type === 'VIDEO') {
                    throw new Error('INCOMPLETE_CONTENT');
                }
            }
        }

        // Update status to PENDING
        await this.prisma.courses.update({
            where: { id: courseId },
            data: {
                status: 'PENDING',
                reject_note: null // Clear any previous reject note
            }
        });
    }

    async getPendingCourses(): Promise<PendingCourseDto[]> {
        const courses = await this.prisma.courses.findMany({
            where: { status: 'PENDING' },
            include: {
                lecturer: {
                    select: { full_name: true }
                }
            },
            orderBy: { submitted_at: 'asc' } // FIFO
        });

        return courses.map(course => ({
            id: course.id,
            title: course.title,
            lecturerName: course.lecturer.full_name,
            submittedAt: course.submitted_at || new Date()
        }));
    }

    async moderateCourse(_adminId: bigint, courseId: bigint, dto: ModerateCourseDto): Promise<void> {
        const course = await this.prisma.courses.findUnique({
            where: { id: courseId }
        });

        if (!course || course.status !== 'PENDING') {
            throw new Error('COURSE_NOT_FOUND');
        }

        if (dto.action === 'REJECT' && !dto.rejectNote) {
            throw new Error('REJECT_NOTE_REQUIRED');
        }

        const newStatus = dto.action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';

        await this.prisma.courses.update({
            where: { id: courseId },
            data: {
                status: newStatus,
                reject_note: dto.rejectNote || null
            }
        });
    }

    async getLessonPreview(courseId: bigint, lessonId: bigint): Promise<LessonPreviewDto> {
        // Check if course is accessible for preview (pending or active for admin/lecturer)
        const lesson = await this.prisma.lessons.findFirst({
            where: {
                id: lessonId,
                chapter: {
                    course_id: courseId
                }
            },
            include: {
                questions: true
            }
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        return {
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            content: lesson.content_url || '',
            videoUrl: lesson.content_url || undefined,
            quizQuestions: lesson.questions.map(q => ({
                id: q.id,
                content: q.content,
                options: [q.option_a, q.option_b, q.option_c, q.option_d]
            }))
        };
    }
}
