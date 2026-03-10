import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from '../EnrollmentService';
import { Course, CourseStatus } from '../../domain/Course';
import { Enrollment } from '../../domain/Enrollment';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeCourse = (status: CourseStatus = CourseStatus.ACTIVE) =>
    new Course(10n, 99n, 'Test Course', 'test-course', null, status, null);

const makeEnrollment = () => ({
    id: 1n,
    studentId: 1n,
    courseId: 10n,
    completionRate: 0,
    enrolledAt: new Date(),
} as Enrollment);

// ── Mocks ────────────────────────────────────────────────────────────────────

const makeCourseRepo = () => ({
    findActiveById: vi.fn(),
    findAll: vi.fn(),
});

const makeEnrollmentRepo = () => ({
    findByStudentAndCourse: vi.fn(),
    save: vi.fn(),
    getEnrolledCoursesWithDetails: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EnrollmentService — integration (mocked repos)', () => {
    let courseRepo: ReturnType<typeof makeCourseRepo>;
    let enrollmentRepo: ReturnType<typeof makeEnrollmentRepo>;
    let service: EnrollmentService;

    beforeEach(() => {
        courseRepo     = makeCourseRepo();
        enrollmentRepo = makeEnrollmentRepo();
        service = new EnrollmentService(courseRepo as any, enrollmentRepo as any);
    });

    // ── enrollStudent ─────────────────────────────────────────────────────────
    describe('enrollStudent', () => {
        it('enrolls a student in an active course they are not yet enrolled in', async () => {
            courseRepo.findActiveById.mockResolvedValue(makeCourse());
            enrollmentRepo.findByStudentAndCourse.mockResolvedValue(null);
            enrollmentRepo.save.mockResolvedValue(undefined);

            const result = await service.enrollStudent(1n, 10n);

            expect(enrollmentRepo.save).toHaveBeenCalledOnce();
            expect(result.redirectUrl).toContain('test-course');
        });

        it('returns redirect without re-enrolling if already enrolled (idempotent)', async () => {
            courseRepo.findActiveById.mockResolvedValue(makeCourse());
            enrollmentRepo.findByStudentAndCourse.mockResolvedValue(makeEnrollment());

            const result = await service.enrollStudent(1n, 10n);

            expect(enrollmentRepo.save).not.toHaveBeenCalled();
            expect(result.redirectUrl).toContain('test-course');
        });

        it('throws COURSE_NOT_FOUND when course does not exist', async () => {
            courseRepo.findActiveById.mockResolvedValue(null);

            await expect(service.enrollStudent(1n, 999n)).rejects.toThrow('COURSE_NOT_FOUND');
        });

        it('throws COURSE_NOT_AVAILABLE when course is not ACTIVE', async () => {
            courseRepo.findActiveById.mockResolvedValue(makeCourse(CourseStatus.DRAFT));

            await expect(service.enrollStudent(1n, 10n)).rejects.toThrow('COURSE_NOT_AVAILABLE');
        });
    });

    // ── checkEnrollmentStatus ─────────────────────────────────────────────────
    describe('checkEnrollmentStatus', () => {
        it('returns true when student is enrolled', async () => {
            enrollmentRepo.findByStudentAndCourse.mockResolvedValue(makeEnrollment());
            expect(await service.checkEnrollmentStatus(1n, 10n)).toBe(true);
        });

        it('returns false when student is not enrolled', async () => {
            enrollmentRepo.findByStudentAndCourse.mockResolvedValue(null);
            expect(await service.checkEnrollmentStatus(1n, 10n)).toBe(false);
        });
    });

    // ── getEnrolledCourses ────────────────────────────────────────────────────
    describe('getEnrolledCourses', () => {
        it('returns the list from the repository', async () => {
            const mockList = [{ id: 10n, title: 'Test Course' }];
            enrollmentRepo.getEnrolledCoursesWithDetails.mockResolvedValue(mockList);

            const result = await service.getEnrolledCourses(1n);
            expect(result).toEqual(mockList);
            expect(enrollmentRepo.getEnrolledCoursesWithDetails).toHaveBeenCalledWith(1n, undefined, undefined);
        });

        it('passes filter and sort to the repository', async () => {
            enrollmentRepo.getEnrolledCoursesWithDetails.mockResolvedValue([]);

            await service.getEnrolledCourses(1n, 'in-progress', 'recent');
            expect(enrollmentRepo.getEnrolledCoursesWithDetails).toHaveBeenCalledWith(1n, 'in-progress', 'recent');
        });
    });
});
