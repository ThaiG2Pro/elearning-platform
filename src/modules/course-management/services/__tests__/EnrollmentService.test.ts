import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from '../EnrollmentService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const makeEnrollmentRepo = () => ({
    getEnrolledCoursesWithDetails: vi.fn(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
// WP1.6.3 — enrollStudent/checkEnrollmentStatus were removed (zero UI
// callers, dead since the ownership pivot); only getEnrolledCourses remains.

describe('EnrollmentService — integration (mocked repos)', () => {
    let enrollmentRepo: ReturnType<typeof makeEnrollmentRepo>;
    let service: EnrollmentService;

    beforeEach(() => {
        enrollmentRepo = makeEnrollmentRepo();
        service = new EnrollmentService(enrollmentRepo as any);
    });

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
