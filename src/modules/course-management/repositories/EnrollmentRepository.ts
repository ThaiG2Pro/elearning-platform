import { PrismaClient } from '@prisma/client';
import { Enrollment } from '../domain/Enrollment';
import { EnrolledCourseDto } from '../dtos/EnrolledCourseDto';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export class EnrollmentRepository {
    constructor(private prisma: PrismaClient) { }

    async findByStudentAndCourse(studentId: bigint, courseId: bigint): Promise<Enrollment | null> {
        const enrollment = await this.prisma.enrollments.findFirst({
            where: {
                student_id: studentId,
                course_id: courseId,
            },
        });

        if (!enrollment) return null;

        return new Enrollment(
            enrollment.id,
            enrollment.student_id,
            enrollment.course_id,
            enrollment.completion_rate,
            enrollment.enrolled_at || new Date()
        );
    }

    async findByStudent(studentId: bigint): Promise<Enrollment[]> {
        const enrollments = await this.prisma.enrollments.findMany({
            where: { student_id: studentId },
        });

        return enrollments.map(enrollment => new Enrollment(
            enrollment.id,
            enrollment.student_id,
            enrollment.course_id,
            enrollment.completion_rate,
            enrollment.enrolled_at || new Date()
        ));
    }

    async getEnrolledCoursesWithDetails(studentId: bigint, filter?: string | null, sort?: string | null): Promise<EnrolledCourseDto[]> {
        let whereClause: any = {
            student_id: studentId,
        };

        if (filter === 'in_progress') {
            whereClause.completion_rate = { lt: 100 };
        } else if (filter === 'completed') {
            whereClause.completion_rate = { gte: 100 };
        }

        let orderBy: any = { enrolled_at: 'desc' };
        if (sort === 'enrolled_at_asc') {
            orderBy = { enrolled_at: 'asc' };
        }

        const enrollments = await this.prisma.enrollments.findMany({
            where: whereClause,
            orderBy,
            include: {
                course: {
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
                },
            },
        });

        return enrollments.map(enrollment => {
            // Find the first video across all chapters and lessons
            const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(enrollment.course.chapters);
            const thumbnailUrl = firstVideoUrl
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl)
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBUaHVtYm5haWw8L3RleHQ+Cjwvc3ZnPg==';

            return {
                id: Number(enrollment.course.id),
                title: enrollment.course.title,
                slug: enrollment.course.slug,
                status: enrollment.course.status,
                thumbnailUrl,
                completionRate: enrollment.completion_rate,
                enrolledAt: enrollment.enrolled_at || new Date(),
            };
        });
    }

    async findById(id: bigint): Promise<Enrollment | null> {
        const enrollment = await this.prisma.enrollments.findUnique({
            where: { id },
        });

        if (!enrollment) return null;

        return new Enrollment(
            enrollment.id,
            enrollment.student_id,
            enrollment.course_id,
            enrollment.completion_rate,
            enrollment.enrolled_at || new Date()
        );
    }

    async save(enrollment: Enrollment): Promise<Enrollment> {
        const data = {
            student_id: enrollment.studentId,
            course_id: enrollment.courseId,
            completion_rate: enrollment.completionRate,
            enrolled_at: enrollment.enrolledAt,
        };

        if (enrollment.id) {
            const updated = await this.prisma.enrollments.update({
                where: { id: enrollment.id },
                data,
            });
            return new Enrollment(
                updated.id,
                updated.student_id,
                updated.course_id,
                updated.completion_rate,
                updated.enrolled_at || new Date()
            );
        } else {
            const created = await this.prisma.enrollments.create({
                data,
            });
            return new Enrollment(
                created.id,
                created.student_id,
                created.course_id,
                created.completion_rate,
                created.enrolled_at || new Date()
            );
        }
    }
}
