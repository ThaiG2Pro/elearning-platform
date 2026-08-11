import { CourseRepository } from '../repositories/CourseRepository';
import { SectionRepository } from '../repositories/SectionRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';
import { PublishingPolicy } from '../domain/PublishingPolicy';
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

        const course = await this.courseRepository.findById(section.courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        AccessControlPolicy.validateOwnership(userId, course.ownerId);

        const currentCount = await this.sectionRepository.countByCourse(section.courseId);

        PublishingPolicy.validateDeletionEligibility(currentCount);

        await this.sectionRepository.deleteWithLessons(sectionId);
    }

    async syncCourseContent(userId: bigint, courseId: bigint, dto: BulkCourseContentDto) {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        // Personal-organizer model: the owner can sync content at any time,
        // active or not — no approval-driven lock.
        AccessControlPolicy.validateOwnership(userId, course.ownerId);

        const lessons: any[] = [];
        const { Lesson: LessonDomain, LessonType } = require('../domain/Lesson');

        // Helper: extract raw URL from potentially legacy JSON format {"url":"..."}
        const extractRawUrl = (url: string): string => {
            try {
                const parsed = JSON.parse(url);
                if (parsed && parsed.url) return parsed.url;
            } catch { /* raw URL */ }
            return url;
        };

        // Accept either flat lessons or structured sections
        if (Array.isArray(dto.sections)) {
            for (const sec of dto.sections) {
                const secId = sec.id;
                if (!Array.isArray(sec.lessons)) continue;
                for (const lessonDto of sec.lessons) {
                    const lessonId = lessonDto.id ? BigInt(lessonDto.id) : null;
                    if ((lessonDto.type || 'VIDEO') === 'VIDEO') {
                        if (lessonDto.contentUrl) {
                            const rawUrl = extractRawUrl(lessonDto.contentUrl);
                            const lesson = new LessonDomain(
                                lessonId,
                                BigInt(secId || lessonDto.chapterId),
                                lessonDto.title,
                                LessonType.VIDEO,
                                rawUrl,
                                lessonDto.orderIndex
                            );
                            lessons.push(lesson);
                        } else {
                            const lesson = new LessonDomain(
                                lessonId,
                                BigInt(secId || lessonDto.chapterId),
                                lessonDto.title,
                                LessonType.VIDEO,
                                '',
                                lessonDto.orderIndex
                            );
                            lessons.push(lesson);
                        }
                    } else {
                        // Quiz lesson - preserve existing id so questions remain linked
                        const lesson = new LessonDomain(
                            lessonId,
                            BigInt(secId || lessonDto.chapterId),
                            lessonDto.title,
                            LessonType.QUIZ,
                            '{}',
                            lessonDto.orderIndex
                        );
                        lessons.push(lesson);
                    }
                }
            }
        } else if (Array.isArray(dto.lessons)) {
            for (const lessonDto of dto.lessons) {
                const lessonId = lessonDto.id ? BigInt(lessonDto.id) : null;
                if ((lessonDto.type || 'VIDEO') === 'VIDEO') {
                    if (lessonDto.contentUrl) {
                        const rawUrl = extractRawUrl(lessonDto.contentUrl);
                        const lesson = new LessonDomain(
                            lessonId,
                            BigInt(lessonDto.chapterId),
                            lessonDto.title,
                            LessonType.VIDEO,
                            rawUrl,
                            lessonDto.orderIndex
                        );
                        lessons.push(lesson);
                    } else {
                        const lesson = new LessonDomain(
                            lessonId,
                            BigInt(lessonDto.chapterId),
                            lessonDto.title,
                            LessonType.VIDEO,
                            '',
                            lessonDto.orderIndex
                        );
                        lessons.push(lesson);
                    }
                } else {
                    const lesson = new LessonDomain(
                        lessonId,
                        BigInt(lessonDto.chapterId),
                        lessonDto.title,
                        LessonType.QUIZ,
                        '{}',
                        lessonDto.orderIndex
                    );
                    lessons.push(lesson);
                }
            }
        }

        // Persist through repository (upsert: update existing, create new, delete removed)
        await this.lessonRepository.syncLessons(courseId, lessons);
    }

    /**
     * Owner-only preview of a lesson (used by the "view my course" screen).
     * There is no approval workflow to gate on anymore — access is purely
     * by ownership.
     */
    async getLessonPreview(courseId: bigint, lessonId: bigint, user: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        const lesson = await this.lessonRepository.findById(lessonId);
        if (!lesson) throw new Error('LESSON_NOT_FOUND');

        // Check if lesson belongs to the course
        const chapter = await this.sectionRepository.findById(lesson.chapterId);
        if (!chapter || chapter.courseId !== courseId) {
            throw new Error('LESSON_NOT_FOUND');
        }

        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        if (!user) throw new Error('Unauthorized');
        if (course.ownerId !== user.id) throw new Error('FORBIDDEN');

        const quizQuestions = await this.lessonRepository.findQuizQuestions(lessonId);

        return {
            id: lesson.id!,
            title: lesson.title,
            type: lesson.type,
            content: lesson.contentUrl || '',
            videoUrl: lesson.contentUrl || undefined,
            quizQuestions: quizQuestions.map(q => {
                const answerKey = (q as any).answerKey || undefined;
                // Same padding-strip as QuestionRepository.buildOptions —
                // questions uploaded with fewer than 4 options are padded
                // with '' at insert time; without filtering, this preview
                // (shown to the lecturer before they re-upload) displayed
                // phantom empty options alongside the real ones.
                const options = [q.optionA, q.optionB, q.optionC, q.optionD].filter(opt => opt.trim().length > 0);
                const correctIdx = typeof answerKey === 'string' ? QuizPolicy.resolveCorrectIndex(answerKey, options) : null;
                const correctId = correctIdx !== null && correctIdx >= 0 ? `option_${correctIdx}` : null;

                return {
                    id: q.id,
                    content: q.content,
                    options,
                    answerKey: answerKey || undefined,
                    correctIndex: correctIdx !== null ? correctIdx : null,
                    correctId: correctId,
                };
            })
        };
    }
}
