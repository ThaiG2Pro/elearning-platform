import { SpaceRepository } from '../repositories/SpaceRepository';
import { SectionRepository } from '../repositories/SectionRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { AccessControlPolicy } from '../domain/AccessControlPolicy';
import { PublishingPolicy } from '../domain/PublishingPolicy';
import { BulkSpaceContentDto } from '../dtos/BulkSpaceContentDto';
import { LessonPreviewDto } from './ContentManagementService';
import { QuizPolicy } from '../domain/QuizPolicy';

export class SpaceManagementService {
    constructor(
        private spaceRepository: SpaceRepository,
        private sectionRepository: SectionRepository,
        private lessonRepository: LessonRepository,
    ) { }

    async deleteSection(userId: bigint, sectionId: bigint) {
        const section = await this.sectionRepository.findById(sectionId);
        if (!section) throw new Error('SECTION_NOT_FOUND');

        const space = await this.spaceRepository.findById(section.spaceId);
        if (!space) throw new Error('SPACE_NOT_FOUND');

        AccessControlPolicy.validateOwnership(userId, space.ownerId);

        const currentCount = await this.sectionRepository.countBySpace(section.spaceId);

        PublishingPolicy.validateDeletionEligibility(currentCount);

        await this.sectionRepository.deleteWithLessons(sectionId);
    }

    async syncSpaceContent(userId: bigint, spaceId: bigint, dto: BulkSpaceContentDto) {
        const space = await this.spaceRepository.findById(spaceId);
        if (!space) throw new Error('SPACE_NOT_FOUND');

        // Personal-organizer model: the owner can sync content at any time,
        // active or not — no approval-driven lock.
        AccessControlPolicy.validateOwnership(userId, space.ownerId);

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
        await this.lessonRepository.syncLessons(spaceId, lessons);
    }

    /**
     * Owner-only preview of a lesson (used by the "view my space" screen).
     * There is no approval workflow to gate on anymore — access is purely
     * by ownership.
     */
    async getLessonPreview(spaceId: bigint, lessonId: bigint, user: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        const lesson = await this.lessonRepository.findById(lessonId);
        if (!lesson) throw new Error('LESSON_NOT_FOUND');

        // Check if lesson belongs to the space
        const chapter = await this.sectionRepository.findById(lesson.chapterId);
        if (!chapter || chapter.spaceId !== spaceId) {
            throw new Error('LESSON_NOT_FOUND');
        }

        const space = await this.spaceRepository.findById(spaceId);
        if (!space) throw new Error('SPACE_NOT_FOUND');

        if (!user) throw new Error('Unauthorized');
        if (space.ownerId !== user.id) throw new Error('FORBIDDEN');

        const quizQuestions = await this.lessonRepository.findQuizQuestions(lessonId);

        return {
            id: lesson.id!,
            title: lesson.title,
            type: lesson.type,
            content: lesson.contentUrl || '',
            videoUrl: lesson.contentUrl || undefined,
            quizQuestions: quizQuestions.map(q => {
                const answerKey = q.answerKey || undefined;
                const options = q.options;
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
