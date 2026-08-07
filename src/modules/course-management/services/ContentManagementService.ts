import { CourseRepository } from '../repositories/CourseRepository';
import { QuizPolicy } from '../domain/QuizPolicy';
import { Course, CourseStatus } from '../domain/Course';
import { CreateCourseDto, CourseSummaryDto } from '../dtos/CourseManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto, LessonDto } from '../dtos/ContentDto';
import { PrismaClient } from '@prisma/client';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export interface QuizQuestionPreviewDto {
    id: bigint;
    content: string;
    options: string[];
    answerKey?: string;
    correctIndex?: number | null;
    correctId?: string | null;
}

export interface LessonPreviewDto {
    id: bigint;
    title: string;
    type: string;
    content: string;
    videoUrl?: string;
    quizQuestions?: QuizQuestionPreviewDto[];
}

export class ContentManagementService {
    constructor(
        private courseRepository: CourseRepository,
        private prisma: PrismaClient
    ) { }

    async getLecturerCourses(lecturerId: bigint, status?: string | null): Promise<CourseSummaryDto[]> {
        const whereClause: any = {
            OR: [
                { owner_id: lecturerId },
                { lecturer_id: lecturerId },
            ]
        };
        if (status) {
            whereClause.status = status.toUpperCase();
        }

        const courses = await this.prisma.courses.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                status: true,
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
            );
        });
    }

    async createCourse(lecturerId: bigint, dto: CreateCourseDto): Promise<bigint> {
        const baseSlug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const suffix = Math.random().toString(36).slice(2, 7);
        const slug = `${baseSlug}-${suffix}`;
        // Personal-organizer model: a course is live for its owner immediately,
        // no admin approval gate (Checkpoint 0 pivot).
        const course = new Course(
            null,
            lecturerId,
            dto.title,
            slug,
            dto.description || '',
            CourseStatus.ACTIVE,
        );

        await this.courseRepository.create(course);
        return course.id!;
    }

    async updateCourseMetadata(lecturerId: bigint, courseId: bigint, data: { title?: string; description?: string }): Promise<void> {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        if (course.lecturerId !== lecturerId) {
            throw new Error('ACCESS_DENIED');
        }

        // Owner can edit their course at any time — no approval-driven lock.
        if (data.title) {
            course.title = data.title;
        }
        if (data.description !== undefined) {
            course.description = data.description;
        }

        await this.courseRepository.save(course);
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
                order_index: dto.orderIndex ?? 0,
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

    /**
     * Owner-only preview of a lesson (used by the "view my course" screen).
     * There is no approval workflow to gate on anymore — access is purely
     * by ownership.
     */
    async getLessonPreview(courseId: bigint, lessonId: bigint, user?: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        const lesson = await this.prisma.lessons.findFirst({
            where: {
                id: lessonId,
                chapter: {
                    course_id: courseId
                }
            },
            include: {
                questions: true,
                chapter: {
                    include: { course: true }
                }
            }
        });

        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        const course = lesson.chapter.course;

        if (!user) {
            throw new Error('Unauthorized');
        }

        if (course.owner_id !== user.id) {
            throw new Error('FORBIDDEN');
        }

        return {
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            content: lesson.content_url || '',
            videoUrl: lesson.content_url || undefined,
            quizQuestions: lesson.questions.map(q => {
                const answerKey = (q as any).answer_key || (q as any).answerKey || undefined;
                const correctIdx = typeof answerKey === 'string' ? QuizPolicy.keyToIndex(answerKey) : null;
                const correctId = correctIdx !== null && correctIdx >= 0 ? `option_${correctIdx}` : null;

                return {
                    id: q.id,
                    content: q.content,
                    options: [q.option_a, q.option_b, q.option_c, q.option_d],
                    answerKey: answerKey || undefined,
                    correctIndex: correctIdx !== null ? correctIdx : null,
                    correctId: correctId,
                };
            })
        };
    }
}
