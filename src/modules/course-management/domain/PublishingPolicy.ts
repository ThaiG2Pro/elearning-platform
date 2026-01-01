import { Course } from './Course';

export class PublishingPolicy {
    static validateDeletionEligibility(course: any, currentCount: number) {
        if (course.status !== 'DRAFT') {
            throw new Error('INVALID_STATE');
        }
        if (currentCount <= 1) {
            throw new Error('CANNOT_DELETE_LAST_SECTION');
        }
    }

    static validateMinimumViableContent(course: Course) {
        // Rule 40: Check minimum viable content for publishing
        if (!course.title || course.title.trim() === '') {
            throw new Error('COURSE_TITLE_REQUIRED');
        }

        if (!course.description || course.description.trim() === '') {
            throw new Error('COURSE_DESCRIPTION_REQUIRED');
        }

        if (course.chapters.length === 0) {
            throw new Error('COURSE_MUST_HAVE_SECTIONS');
        }

        // Check that all chapters have at least one lesson
        for (const chapter of course.chapters) {
            if (chapter.lessons.length === 0) {
                throw new Error(`SECTION_${chapter.title}_MUST_HAVE_LESSONS`);
            }
        }
    }

    static validateModerationEligibility(status: string) {
        if (status !== 'PENDING') {
            throw new Error('COURSE_NOT_PENDING');
        }
    }

    static validateRejectNote(note: string) {
        if (!note || note.trim() === '') {
            throw new Error('REJECT_NOTE_REQUIRED');
        }
    }
}
