import { CourseRepository } from '../repositories/CourseRepository';
import { SectionRepository } from '../repositories/SectionRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';
import { PublishingPolicy } from '../domain/PublishingPolicy';
import { YouTubeAdapter } from '../../../shared/adapters/YouTubeAdapter';
import { LessonFactory } from '../domain/LessonFactory';
import { BulkCourseContentDto } from '../dtos/BulkCourseContentDto';
import { LessonPreviewDto } from './ContentManagementService';
import { QuizPolicy } from '../domain/QuizPolicy';

export class CourseManagementService {
    constructor(
        private courseRepository: CourseRepository,
        private sectionRepository: SectionRepository,
        private lessonRepository: LessonRepository,
    ) { }

    async deleteSection(userId: bigint, sectionId: bigint) {
        const section = await this.sectionRepository.findById(sectionId);
        if (!section) throw new Error('SECTION_NOT_FOUND');

        AccessControlPolicy.validateOwnership(userId, section.ownerId);

        const course = await this.courseRepository.findById(section.courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        const currentCount = await this.sectionRepository.countByCourse(section.courseId);

        PublishingPolicy.validateDeletionEligibility(course, currentCount);

        await this.sectionRepository.deleteWithLessons(sectionId);
    }

    async syncCourseContent(userId: bigint, courseId: bigint, dto: BulkCourseContentDto) {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        // Only allow syncing content when course in DRAFT
        if (course.status !== 'DRAFT') {
            throw new Error('INVALID_STATUS');
        }

        AccessControlPolicy.validateOwnership(userId, course.lecturerId);

        const youtubeAdapter = new YouTubeAdapter();
        const lessons: any[] = [];
        const { Lesson: LessonDomain, LessonType } = require('../domain/Lesson');

        // Accept either flat lessons or structured sections
        if (Array.isArray(dto.sections)) {
            for (const sec of dto.sections) {
                const secId = sec.id;
                if (!Array.isArray(sec.lessons)) continue;
                for (const lessonDto of sec.lessons) {
                    if ((lessonDto.type || 'VIDEO') === 'VIDEO') {
                        if (lessonDto.contentUrl) {
                            const metadata = await youtubeAdapter.fetchMetadata(lessonDto.contentUrl);
                            const lesson = LessonFactory.createVideoLesson({
                                chapterId: BigInt(secId || lessonDto.chapterId),
                                title: lessonDto.title,
                                videoUrl: lessonDto.contentUrl,
                                orderIndex: lessonDto.orderIndex,
                            }, metadata);
                            lessons.push(lesson);
                        } else {
                            // Create video lesson without metadata/content
                            const lesson = new LessonDomain(
                                null,
                                BigInt(secId || lessonDto.chapterId),
                                lessonDto.title,
                                LessonType.VIDEO,
                                '',
                                lessonDto.orderIndex
                            );
                            lessons.push(lesson);
                        }
                    } else {
                        // Quiz lesson - create placeholder with empty quiz data
                        const lesson = LessonFactory.createQuizLesson(BigInt(secId || lessonDto.chapterId), lessonDto.title, {}, lessonDto.orderIndex);
                        lessons.push(lesson);
                    }
                }
            }
        } else if (Array.isArray(dto.lessons)) {
            for (const lessonDto of dto.lessons) {
                if ((lessonDto.type || 'VIDEO') === 'VIDEO') {
                    if (lessonDto.contentUrl) {
                        const metadata = await youtubeAdapter.fetchMetadata(lessonDto.contentUrl);
                        const lesson = LessonFactory.createVideoLesson({
                            chapterId: BigInt(lessonDto.chapterId),
                            title: lessonDto.title,
                            videoUrl: lessonDto.contentUrl,
                            orderIndex: lessonDto.orderIndex,
                        }, metadata);
                        lessons.push(lesson);
                    } else {
                        const lesson = new LessonDomain(
                            null,
                            BigInt(lessonDto.chapterId),
                            lessonDto.title,
                            LessonType.VIDEO,
                            '',
                            lessonDto.orderIndex
                        );
                        lessons.push(lesson);
                    }
                } else {
                    const lesson = LessonFactory.createQuizLesson(BigInt(lessonDto.chapterId), lessonDto.title, {}, lessonDto.orderIndex);
                    lessons.push(lesson);
                }
            }
        }

        // Persist through repository which will replace existing lessons for course
        await this.lessonRepository.syncLessons(courseId, lessons);
    }

    async submitForApproval(userId: bigint, courseId: bigint) {
        const course = await this.courseRepository.findByIdWithFullStructure(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        AccessControlPolicy.validateOwnership(userId, course.lecturerId);

        PublishingPolicy.validateMinimumViableContent(course);

        course.submit();

        await this.courseRepository.save(course);
    }

    async getLessonPreview(courseId: bigint, lessonId: bigint, user: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        // For preview, allow access according to role rules
        const lesson = await this.lessonRepository.findById(lessonId);
        if (!lesson) throw new Error('LESSON_NOT_FOUND');

        // Check if lesson belongs to the course
        const chapter = await this.sectionRepository.findById(lesson.chapterId);
        if (!chapter || chapter.courseId !== courseId) {
            throw new Error('LESSON_NOT_FOUND');
        }

        // Load course to check ownership & status
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        // Access control
        if (!user) throw new Error('Unauthorized');

        if (user.role === 'STUDENT') {
            throw new Error('FORBIDDEN');
        }

        if (user.role === 'LECTURER') {
            if (course.lecturerId !== user.id) throw new Error('FORBIDDEN');
            if (course.status !== 'PENDING' && course.status !== 'ACTIVE') throw new Error('FORBIDDEN');
        }

        if (user.role === 'ADMIN') {
            if (course.status !== 'PENDING') throw new Error('FORBIDDEN');
        }

        const quizQuestions = await this.lessonRepository.findQuizQuestions(lessonId);

        return {
            id: lesson.id!,
            title: lesson.title,
            type: lesson.type,
            content: lesson.contentUrl || '',
            videoUrl: lesson.contentUrl || undefined,
            quizQuestions: quizQuestions.map(q => {
                const answerKey = (q as any).answerKey || undefined;
                const correctIdx = typeof answerKey === 'string' ? QuizPolicy.keyToIndex(answerKey) : null;
                const correctId = correctIdx !== null && correctIdx >= 0 ? `option_${correctIdx}` : null;

                return {
                    id: q.id,
                    content: q.content,
                    options: [q.optionA, q.optionB, q.optionC, q.optionD],
                    answerKey: answerKey || undefined,
                    correctIndex: correctIdx !== null ? correctIdx : null,
                    correctId: correctId,
                };
            })
        };
    }
}
