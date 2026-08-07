import { describe, it, expect } from 'vitest';
import { EnrollmentPolicy } from '../EnrollmentPolicy';
import { Course, CourseStatus } from '../Course';

const makeCourse = (status: CourseStatus) =>
    new Course(1n, 10n, 'Test Course', 'test-course', null, status);

describe('EnrollmentPolicy', () => {
    describe('validateCourseAvailability', () => {
        it('returns the course when it is ACTIVE', () => {
            const course = makeCourse(CourseStatus.ACTIVE);
            expect(EnrollmentPolicy.validateCourseAvailability(course)).toBe(course);
        });

        it('throws COURSE_NOT_FOUND when course is null', () => {
            expect(() => EnrollmentPolicy.validateCourseAvailability(null)).toThrow('COURSE_NOT_FOUND');
        });

        it('throws COURSE_NOT_AVAILABLE when status is ARCHIVED', () => {
            expect(() => EnrollmentPolicy.validateCourseAvailability(makeCourse(CourseStatus.ARCHIVED)))
                .toThrow('COURSE_NOT_AVAILABLE');
        });
    });
});
