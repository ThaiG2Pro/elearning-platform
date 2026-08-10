import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
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
            course.owner_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
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
            course.owner_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
        );
    }

    async findByIdWithFullStructure(id: bigint): Promise<any> {
        const course = await this.prisma.courses.findUnique({
            where: { id },
            include: {
                owner: {
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

        const domainCourse = new Course(
            course.id,
            course.owner_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
            chapters,
        );
        (domainCourse as any).ownerName = course.owner.full_name;
        return domainCourse;
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

    async create(course: Course): Promise<void> {
        const created = await this.prisma.courses.create({
            data: {
                owner_id: course.ownerId,
                title: course.title,
                slug: course.slug,
                description: course.description,
                status: course.status,
            },
        });
        course.id = created.id;
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
            },
        });
    }

    /**
     * Returns the course's existing share token, generating a stable one on
     * first request. Tokens are opaque (not the numeric id) so a future
     * migration of ids never breaks a link already handed out — required by
     * ROADMAP.md principle #3 (share links must survive upgrades).
     */
    async ensureShareToken(courseId: bigint): Promise<string> {
        const existing = await this.prisma.courses.findUnique({
            where: { id: courseId },
            select: { share_token: true },
        });
        if (!existing) throw new Error('COURSE_NOT_FOUND');
        if (existing.share_token) return existing.share_token;

        // Collisions are astronomically unlikely (10 bytes of randomness) but
        // retry a few times against the unique constraint just in case.
        for (let attempt = 0; attempt < 5; attempt++) {
            const token = randomBytes(10).toString('base64url');
            try {
                await this.prisma.courses.update({
                    where: { id: courseId },
                    data: { share_token: token },
                });
                return token;
            } catch (error: any) {
                if (error?.code === 'P2002') continue; // unique violation, retry
                throw error;
            }
        }
        throw new Error('SHARE_TOKEN_GENERATION_FAILED');
    }

    /**
     * WP1.5.11: once shared there was no way to take a link back — clearing
     * the token immediately 404s the old URL (findByShareToken looks it up
     * by token, so a cleared token simply can't be found anymore).
     */
    async clearShareToken(courseId: bigint): Promise<void> {
        await this.prisma.courses.update({
            where: { id: courseId },
            data: { share_token: null },
        });
    }

    /** WP1.5.11: for the "my share links" management screen. */
    async findOwnedWithShareStatus(userId: bigint): Promise<Array<{ id: bigint; title: string; shareToken: string | null }>> {
        const courses = await this.prisma.courses.findMany({
            where: { owner_id: userId },
            select: { id: true, title: true, share_token: true },
            orderBy: { id: 'desc' },
        });
        return courses.map(c => ({ id: c.id, title: c.title, shareToken: c.share_token }));
    }

    /** Public lookup by share token — no ownership check, used by anonymous visitors. */
    async findByShareToken(token: string): Promise<any | null> {
        const course = await this.prisma.courses.findFirst({
            where: { share_token: token, status: 'ACTIVE' },
            include: {
                owner: { select: { full_name: true } },
                chapters: {
                    include: { lessons: true },
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
            return new Chapter(chapter.id, chapter.course_id, chapter.title, chapter.order_index, lessons);
        });

        const domainCourse = new Course(
            course.id,
            course.owner_id,
            course.title,
            course.slug,
            course.description,
            course.status as CourseStatus,
            chapters,
            course.share_token,
        );
        (domainCourse as any).ownerName = course.owner?.full_name || '';
        return domainCourse;
    }

    /**
     * Deep-copies a course (chapters + lessons, reusing the same `Source`
     * rows) into a brand new course owned by `newOwnerId`. Used by "Sao chép
     * về học" on a shared course — the copy is fully independent afterwards,
     * so editing/archiving it never touches the original owner's course.
     */
    async cloneForOwner(courseId: bigint, newOwnerId: bigint): Promise<bigint> {
        // WP1.5.12 — idempotency: if this owner already cloned this exact
        // source course, return the existing clone instead of making another.
        // Checked up front (fast path for the common case) and re-checked via
        // the DB unique constraint below (race-safe for concurrent double-submits).
        const existingClone = await this.prisma.courses.findFirst({
            where: { owner_id: newOwnerId, cloned_from_course_id: courseId },
            select: { id: true },
        });
        if (existingClone) return existingClone.id;

        const source = await this.prisma.courses.findUnique({
            where: { id: courseId },
            include: { chapters: { include: { lessons: true }, orderBy: { order_index: 'asc' } } },
        });
        if (!source) throw new Error('COURSE_NOT_FOUND');

        const baseSlug = source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const suffix = randomBytes(4).toString('hex');
        const slug = `${baseSlug}-${suffix}`;

        try {
            return await this.prisma.$transaction(async (tx) => {
                const created = await tx.courses.create({
                    data: {
                        owner_id: newOwnerId,
                        title: source.title,
                        slug,
                        description: source.description,
                        status: 'ACTIVE',
                        cloned_from_course_id: courseId,
                    },
                });

                for (const chapter of source.chapters) {
                    const newChapter = await tx.chapters.create({
                        data: {
                            course_id: created.id,
                            title: chapter.title,
                            order_index: chapter.order_index,
                        },
                    });

                    for (const lesson of chapter.lessons) {
                        await tx.lessons.create({
                            data: {
                                chapter_id: newChapter.id,
                                source_id: lesson.source_id,
                                title: lesson.title,
                                type: lesson.type,
                                content_url: lesson.content_url,
                                order_index: lesson.order_index,
                            },
                        });
                    }
                }

                return created.id;
            });
        } catch (error: any) {
            // P2002 = unique violation on (owner_id, cloned_from_course_id) —
            // a concurrent request (double-submit/double-fire) won the race
            // and created the clone first. Return that one instead of erroring.
            if (error?.code === 'P2002') {
                const raceWinner = await this.prisma.courses.findFirst({
                    where: { owner_id: newOwnerId, cloned_from_course_id: courseId },
                    select: { id: true },
                });
                if (raceWinner) return raceWinner.id;
            }
            throw error;
        }
    }
}
