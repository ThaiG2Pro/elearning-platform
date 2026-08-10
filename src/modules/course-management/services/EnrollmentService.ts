import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { EnrolledCourseDto } from '../dtos/EnrolledCourseDto';

// WP1.6.3 — enrollStudent/checkEnrollmentStatus (the marketplace-style
// STUDENT-enrolls-in-LECTURER's-course write path) were removed: zero UI
// callers anywhere in src/app (confirmed by grep), dead since the ownership
// pivot (WP0.2) made course access owner_id-based instead. Keeping a
// functioning-but-unused write path around is a trap — a future UI/AI
// change could wire it back up and silently reintroduce a second,
// disconnected "enrolled" concept alongside owner_id. getEnrolledCourses is
// the one enrollment-shaped read path still in real use (/my-learning, the
// homepage's "học tiếp" strip) and it no longer touches the `enrollments`
// table at all — see EnrollmentRepository.getEnrolledCoursesWithDetails.
export class EnrollmentService {
    constructor(
        private enrollmentRepository: EnrollmentRepository,
    ) { }

    async getEnrolledCourses(userId: bigint, filter?: string | null, sort?: string | null): Promise<EnrolledCourseDto[]> {
        return this.enrollmentRepository.getEnrolledCoursesWithDetails(userId, filter || undefined, sort || undefined);
    }
}
