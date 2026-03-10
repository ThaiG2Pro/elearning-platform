import { describe, it, expect } from 'vitest';
import { AccessControlPolicy } from '../AccessControlPolicy';
import { Course, CourseStatus } from '../Course';

const makeCourse = (lecturerId: bigint, status: CourseStatus) =>
    new Course(1n, lecturerId, 'Title', 'slug', null, status, null);

describe('AccessControlPolicy', () => {
    describe('validateOwnership', () => {
        it('does not throw when userId matches ownerId', () => {
            expect(() => AccessControlPolicy.validateOwnership(42n, 42n)).not.toThrow();
        });

        it('throws ACCESS_DENIED when userId does not match ownerId', () => {
            expect(() => AccessControlPolicy.validateOwnership(1n, 99n)).toThrow('ACCESS_DENIED');
        });
    });

    describe('validateOwnershipAndState', () => {
        it('passes when user is the owner and course is DRAFT', () => {
            const course = makeCourse(5n, CourseStatus.DRAFT);
            expect(() => AccessControlPolicy.validateOwnershipAndState(5n, course)).not.toThrow();
        });

        it('throws ACCESS_DENIED when user is not the owner', () => {
            const course = makeCourse(5n, CourseStatus.DRAFT);
            expect(() => AccessControlPolicy.validateOwnershipAndState(99n, course)).toThrow('ACCESS_DENIED');
        });

        it('throws COURSE_NOT_DRAFT when course is not DRAFT', () => {
            for (const status of [CourseStatus.PENDING, CourseStatus.ACTIVE, CourseStatus.REJECTED]) {
                const course = makeCourse(5n, status);
                expect(() => AccessControlPolicy.validateOwnershipAndState(5n, course)).toThrow('COURSE_NOT_DRAFT');
            }
        });
    });
});
