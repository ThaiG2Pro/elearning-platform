import { describe, it, expect } from 'vitest';
import { PublishingPolicy } from '../PublishingPolicy';
import { Course, CourseStatus } from '../Course';
import { Chapter } from '../Chapter';
import { Lesson, LessonType } from '../Lesson';

const makeLesson = () =>
    new Lesson(1n, 1n, 'Lesson 1', LessonType.VIDEO, 'https://youtube.com/watch?v=abc', 1);

const makeChapter = (lessonCount = 1) => {
    const chapter = new Chapter(1n, 1n, 'Chapter 1', 1, []);
    for (let i = 0; i < lessonCount; i++) chapter.lessons.push(makeLesson());
    return chapter;
};

const makeCourse = (overrides: Partial<{ title: string; chapters: Chapter[]; status: CourseStatus }> = {}) =>
    new Course(
        1n, 10n,
        overrides.title ?? 'Good Title',
        'slug',
        null,
        overrides.status ?? CourseStatus.DRAFT,
        null,
        undefined,
        overrides.chapters ?? [makeChapter(1)],
    );

describe('PublishingPolicy', () => {
    describe('validateMinimumViableContent', () => {
        it('passes for a course with title and chapters with lessons', () => {
            expect(() => PublishingPolicy.validateMinimumViableContent(makeCourse())).not.toThrow();
        });

        it('throws COURSE_TITLE_REQUIRED when title is empty', () => {
            const course = makeCourse({ title: '' });
            expect(() => PublishingPolicy.validateMinimumViableContent(course)).toThrow('COURSE_TITLE_REQUIRED');
        });

        it('throws COURSE_TITLE_REQUIRED when title is whitespace only', () => {
            const course = makeCourse({ title: '   ' });
            expect(() => PublishingPolicy.validateMinimumViableContent(course)).toThrow('COURSE_TITLE_REQUIRED');
        });

        it('throws COURSE_MUST_HAVE_SECTIONS when chapters array is empty', () => {
            const course = makeCourse({ chapters: [] });
            expect(() => PublishingPolicy.validateMinimumViableContent(course)).toThrow('COURSE_MUST_HAVE_SECTIONS');
        });

        it('throws SECTION_MUST_HAVE_LESSONS when a chapter has no lessons', () => {
            const course = makeCourse({ chapters: [makeChapter(0)] });
            expect(() => PublishingPolicy.validateMinimumViableContent(course)).toThrow('SECTION_MUST_HAVE_LESSONS');
        });
    });

    describe('validateModerationEligibility', () => {
        it('passes for PENDING status', () => {
            expect(() => PublishingPolicy.validateModerationEligibility('PENDING')).not.toThrow();
        });

        it('throws COURSE_NOT_PENDING for other statuses', () => {
            for (const status of ['DRAFT', 'ACTIVE', 'REJECTED']) {
                expect(() => PublishingPolicy.validateModerationEligibility(status)).toThrow('COURSE_NOT_PENDING');
            }
        });
    });

    describe('validateRejectNote', () => {
        it('passes for a non-empty note', () => {
            expect(() => PublishingPolicy.validateRejectNote('Missing content in chapter 2')).not.toThrow();
        });

        it('throws REJECT_NOTE_REQUIRED when note is empty', () => {
            expect(() => PublishingPolicy.validateRejectNote('')).toThrow('REJECT_NOTE_REQUIRED');
        });

        it('throws REJECT_NOTE_REQUIRED when note is whitespace', () => {
            expect(() => PublishingPolicy.validateRejectNote('   ')).toThrow('REJECT_NOTE_REQUIRED');
        });
    });

    describe('validateDeletionEligibility', () => {
        it('passes when course is DRAFT and more than one section exists', () => {
            expect(() => PublishingPolicy.validateDeletionEligibility({ status: 'DRAFT' }, 3)).not.toThrow();
        });

        it('throws INVALID_STATE when course is not DRAFT', () => {
            expect(() => PublishingPolicy.validateDeletionEligibility({ status: 'ACTIVE' }, 3)).toThrow('INVALID_STATE');
        });

        it('throws CANNOT_DELETE_LAST_SECTION when only one section remains', () => {
            expect(() => PublishingPolicy.validateDeletionEligibility({ status: 'DRAFT' }, 1)).toThrow('CANNOT_DELETE_LAST_SECTION');
        });
    });
});
