import { CourseRepository } from '../repositories/CourseRepository';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';
import { Course, CourseStatus } from '../domain/Course';
import { CreateCourseDto, CourseSummaryDto } from '../dtos/CourseManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto, LessonDto } from '../dtos/ContentDto';
import { PublicCourseDto, ChapterDto as PublicChapterDto, LessonDto as PublicLessonDto } from '../dtos/CourseDetailDto';
import { PrismaClient } from '@prisma/client';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';
import { YouTubeOEmbedAdapter } from '../../../shared/adapters/YouTubeOEmbedAdapter';

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
    private oEmbedAdapter = new YouTubeOEmbedAdapter();

    constructor(
        private courseRepository: CourseRepository,
        private prisma: PrismaClient
    ) { }

    async getOwnedCourses(ownerId: bigint, status?: string | null): Promise<CourseSummaryDto[]> {
        // WP1.6 follow-up — used to OR against the now-removed `lecturer_id`
        // column too; owner_id was always the same value on every write path.
        const whereClause: any = { owner_id: ownerId };
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

    async createCourse(ownerId: bigint, dto: CreateCourseDto): Promise<bigint> {
        const baseSlug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const suffix = Math.random().toString(36).slice(2, 7);
        const slug = `${baseSlug}-${suffix}`;
        // Personal-organizer model: a course is live for its owner immediately,
        // no admin approval gate (Checkpoint 0 pivot).
        const course = new Course(
            null,
            ownerId,
            dto.title,
            slug,
            dto.description || '',
            CourseStatus.ACTIVE,
        );

        await this.courseRepository.create(course);
        return course.id!;
    }

    /**
     * WP1.1 — "dán link → tự parse metadata → tự tạo course". Creates a
     * `Source` (deduped by normalized URL), then a course with one default
     * chapter and one lesson pointing at it, in a single step.
     */
    async createCourseFromLink(ownerId: bigint, url: string): Promise<bigint> {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) throw new Error('URL_REQUIRED');
        if (!YouTubeOEmbedAdapter.isYouTubeUrl(trimmedUrl)) {
            throw new Error('UNSUPPORTED_URL');
        }

        const normalizedUrl = YouTubeOEmbedAdapter.normalize(trimmedUrl);

        let source = await this.prisma.sources.findUnique({ where: { normalized_url: normalizedUrl } });
        if (!source) {
            const meta = await this.oEmbedAdapter.fetchOEmbed(trimmedUrl);
            source = await this.prisma.sources.create({
                data: {
                    url: trimmedUrl,
                    normalized_url: normalizedUrl,
                    title: meta.title,
                    type: 'YOUTUBE',
                    metadata: JSON.stringify({ thumbnailUrl: meta.thumbnailUrl }),
                },
            });
        }

        const baseSlug = (source.title || 'khoa-hoc-moi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const suffix = Math.random().toString(36).slice(2, 7);
        const slug = `${baseSlug}-${suffix}`;

        return await this.prisma.$transaction(async (tx) => {
            const course = await tx.courses.create({
                data: {
                    owner_id: ownerId,
                    title: source!.title || 'Khóa học mới',
                    slug,
                    status: 'ACTIVE',
                },
            });

            const chapter = await tx.chapters.create({
                data: { course_id: course.id, title: 'Chương 1', order_index: 1 },
            });

            await tx.lessons.create({
                data: {
                    chapter_id: chapter.id,
                    source_id: source!.id,
                    title: source!.title || 'Bài học đầu tiên',
                    type: 'VIDEO',
                    content_url: trimmedUrl,
                    order_index: 1,
                },
            });

            return course.id;
        });
    }

    /** Owner-only: returns (generating on first call) the course's stable share token. */
    async getOrCreateShareLink(userId: bigint, courseId: bigint): Promise<string> {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');
        AccessControlPolicy.validateOwnership(userId, course.ownerId);

        return await this.courseRepository.ensureShareToken(courseId);
    }

    /** WP1.5.11: owner-only — revokes a course's share link (old URL 404s afterwards). */
    async revokeShareLink(userId: bigint, courseId: bigint): Promise<void> {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');
        AccessControlPolicy.validateOwnership(userId, course.ownerId);

        await this.courseRepository.clearShareToken(courseId);
    }

    /** WP1.5.11: list of the user's own courses with their current share status, for the "my share links" screen. */
    async listMyShareLinks(userId: bigint): Promise<Array<{ id: number; title: string; shareToken: string | null }>> {
        const courses = await this.courseRepository.findOwnedWithShareStatus(userId);
        return courses.map(c => ({ id: Number(c.id), title: c.title, shareToken: c.shareToken }));
    }

    /** Public: anonymous-safe view of a shared course, keyed by its share token. */
    async getPublicCourseByToken(token: string): Promise<PublicCourseDto> {
        const course = await this.courseRepository.findByShareToken(token);
        if (!course) throw new Error('SHARE_LINK_NOT_FOUND');

        const chapters = course.chapters.map((chapter: any) => {
            const lessons = chapter.lessons.map((lesson: any) => new PublicLessonDto(
                Number(lesson.id),
                lesson.title,
                lesson.type,
                lesson.orderIndex,
                lesson.contentUrl,
            ));
            return new PublicChapterDto(Number(chapter.id), chapter.title, lessons);
        });

        const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(course.chapters);
        return new PublicCourseDto(
            Number(course.id),
            course.title,
            course.description,
            (course as any).ownerName || null,
            chapters,
            firstVideoUrl
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl)
                : '/images/course-placeholder.svg',
            course.shareToken || token,
        );
    }

    /** Clones a shared course into `userId`'s own account ("Sao chép về học"). */
    async cloneSharedCourse(token: string, userId: bigint): Promise<bigint> {
        const course = await this.courseRepository.findByShareToken(token);
        if (!course) throw new Error('SHARE_LINK_NOT_FOUND');

        return await this.courseRepository.cloneForOwner(course.id, userId);
    }

    async updateCourseMetadata(ownerId: bigint, courseId: bigint, data: { title?: string; description?: string; status?: 'ACTIVE' | 'ARCHIVED' }): Promise<void> {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        if (course.ownerId !== ownerId) {
            throw new Error('ACCESS_DENIED');
        }

        // Owner can edit their course at any time — no approval-driven lock.
        if (data.title) {
            course.title = data.title;
        }
        if (data.description !== undefined) {
            course.description = data.description;
        }
        // WP1.6 follow-up (round 3) — Course.archive()/unarchive() existed in
        // the domain since the ownership pivot but nothing ever called them:
        // no route, no service method, no UI action. The /my-courses
        // "Archived" filter tab was consequently always empty. This wires
        // the existing domain methods up through the same update path as
        // title/description.
        if (data.status === 'ARCHIVED') {
            course.archive();
        } else if (data.status === 'ACTIVE') {
            course.unarchive();
        }

        await this.courseRepository.save(course);
    }

    /**
     * WP1.6 follow-up (round 4) — security fix: createSection/updateSection/
     * createLesson/updateLesson/deleteLesson took a bare sectionId/lessonId
     * with no ownership check anywhere in the call chain (some routes
     * checked the parent course, most didn't; the service never did).
     * Confirmed live: an authenticated non-owner could edit/delete any
     * other user's lessons and sections by guessing sequential ids. These
     * two helpers resolve the owning course so every mutation below can be
     * gated the same way as the rest of the module.
     */
    private async getOwnerIdForSection(sectionId: bigint): Promise<bigint> {
        const section = await this.prisma.chapters.findUnique({
            where: { id: sectionId },
            select: { course: { select: { owner_id: true } } },
        });
        if (!section) throw new Error('SECTION_NOT_FOUND');
        return section.course.owner_id;
    }

    private async getOwnerIdForLesson(lessonId: bigint): Promise<bigint> {
        const lesson = await this.prisma.lessons.findUnique({
            where: { id: lessonId },
            select: { chapter: { select: { course: { select: { owner_id: true } } } } },
        });
        if (!lesson) throw new Error('LESSON_NOT_FOUND');
        return lesson.chapter.course.owner_id;
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

    async createSection(userId: bigint, courseId: bigint, dto: CreateSectionDto): Promise<bigint> {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');
        AccessControlPolicy.validateOwnership(userId, course.ownerId);

        const section = await this.prisma.chapters.create({
            data: {
                course_id: courseId,
                title: dto.title,
                order_index: dto.orderIndex ?? 0,
            },
        });
        return section.id;
    }

    async updateSection(userId: bigint, sectionId: bigint, dto: UpdateSectionDto): Promise<void> {
        AccessControlPolicy.validateOwnership(userId, await this.getOwnerIdForSection(sectionId));

        await this.prisma.chapters.update({
            where: { id: sectionId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.orderIndex !== undefined && { order_index: dto.orderIndex }),
            },
        });
    }

    async createLesson(userId: bigint, sectionId: bigint, dto: CreateLessonDto): Promise<bigint> {
        AccessControlPolicy.validateOwnership(userId, await this.getOwnerIdForSection(sectionId));

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

    async updateLesson(userId: bigint, lessonId: bigint, dto: UpdateLessonDto): Promise<void> {
        AccessControlPolicy.validateOwnership(userId, await this.getOwnerIdForLesson(lessonId));

        await this.prisma.lessons.update({
            where: { id: lessonId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.contentUrl !== undefined && { content_url: dto.contentUrl }),
                ...(dto.orderIndex !== undefined && { order_index: dto.orderIndex }),
            },
        });
    }

    async deleteLesson(userId: bigint, lessonId: bigint): Promise<void> {
        AccessControlPolicy.validateOwnership(userId, await this.getOwnerIdForLesson(lessonId));

        await this.prisma.lessons.delete({
            where: { id: lessonId },
        });
    }
}
