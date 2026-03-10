import { describe, it, expect } from 'vitest';
import { Course, CourseStatus } from '../Course';

const makeCourse = (status: CourseStatus = CourseStatus.DRAFT) =>
    new Course(1n, 10n, 'Test Course', 'test-course', null, status, null);

describe('Course — state machine', () => {
    describe('submit', () => {
        it('transitions DRAFT → PENDING', () => {
            const course = makeCourse(CourseStatus.DRAFT);
            course.submit();
            expect(course.status).toBe(CourseStatus.PENDING);
        });

        it('transitions REJECTED → PENDING', () => {
            const course = makeCourse(CourseStatus.REJECTED);
            course.submit();
            expect(course.status).toBe(CourseStatus.PENDING);
        });

        it('clears rejectNote on submit', () => {
            const course = new Course(1n, 10n, 'Title', 'slug', null, CourseStatus.REJECTED, 'Old note');
            course.submit();
            expect(course.rejectNote).toBeNull();
        });

        it('throws INVALID_STATUS_TRANSITION from PENDING', () => {
            const course = makeCourse(CourseStatus.PENDING);
            expect(() => course.submit()).toThrow('INVALID_STATUS_TRANSITION');
        });

        it('throws INVALID_STATUS_TRANSITION from ACTIVE', () => {
            const course = makeCourse(CourseStatus.ACTIVE);
            expect(() => course.submit()).toThrow('INVALID_STATUS_TRANSITION');
        });
    });

    describe('approve', () => {
        it('transitions PENDING → ACTIVE', () => {
            const course = makeCourse(CourseStatus.PENDING);
            course.approve();
            expect(course.status).toBe(CourseStatus.ACTIVE);
        });

        it('throws INVALID_STATUS_TRANSITION from DRAFT', () => {
            expect(() => makeCourse(CourseStatus.DRAFT).approve()).toThrow('INVALID_STATUS_TRANSITION');
        });

        it('throws INVALID_STATUS_TRANSITION from ACTIVE', () => {
            expect(() => makeCourse(CourseStatus.ACTIVE).approve()).toThrow('INVALID_STATUS_TRANSITION');
        });
    });

    describe('reject', () => {
        it('transitions PENDING → DRAFT with a note', () => {
            const course = makeCourse(CourseStatus.PENDING);
            course.reject('Missing content');
            expect(course.status).toBe(CourseStatus.DRAFT);
            expect(course.rejectNote).toBe('Missing content');
        });

        it('throws INVALID_STATUS_TRANSITION from DRAFT', () => {
            expect(() => makeCourse(CourseStatus.DRAFT).reject('note')).toThrow('INVALID_STATUS_TRANSITION');
        });

        it('throws INVALID_STATUS_TRANSITION from ACTIVE', () => {
            expect(() => makeCourse(CourseStatus.ACTIVE).reject('note')).toThrow('INVALID_STATUS_TRANSITION');
        });
    });
});
