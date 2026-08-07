import { describe, it, expect } from 'vitest';
import { Course, CourseStatus } from '../Course';

const makeCourse = (status: CourseStatus = CourseStatus.ACTIVE) =>
    new Course(1n, 10n, 'Test Course', 'test-course', null, status);

describe('Course', () => {
    it('defaults to ACTIVE — no approval gate on creation', () => {
        const course = new Course(null, 10n, 'Title', 'slug', null);
        expect(course.status).toBe(CourseStatus.ACTIVE);
    });

    describe('archive', () => {
        it('transitions ACTIVE → ARCHIVED', () => {
            const course = makeCourse(CourseStatus.ACTIVE);
            course.archive();
            expect(course.status).toBe(CourseStatus.ARCHIVED);
        });
    });

    describe('unarchive', () => {
        it('transitions ARCHIVED → ACTIVE', () => {
            const course = makeCourse(CourseStatus.ARCHIVED);
            course.unarchive();
            expect(course.status).toBe(CourseStatus.ACTIVE);
        });
    });
});
