import { OwnedCoursesRepository } from '../repositories/OwnedCoursesRepository';
import { OwnedCourseDto } from '../dtos/OwnedCourseDto';

// WP1.6.3 — enrollStudent/checkEnrollmentStatus (the marketplace-style
// STUDENT-enrolls-in-LECTURER's-course write path) were removed: zero UI
// callers anywhere in src/app (confirmed by grep), dead since the ownership
// pivot (WP0.2) made course access owner_id-based instead. Keeping a
// functioning-but-unused write path around is a trap — a future UI/AI
// change could wire it back up and silently reintroduce a second,
// disconnected "enrolled" concept alongside owner_id. getOwnedCoursesWithProgress
// is the one read path still in real use (/my-learning, the homepage's
// "học tiếp" strip) and it no longer touches the `enrollments` table at all
// — see OwnedCoursesRepository.getOwnedCoursesWithDetails.
//
// WP1.6 follow-up (round 2) — renamed from EnrollmentService: nothing here
// deals with "enrollment" anymore, it's the read path for a user's owned
// courses annotated with learning progress.
export class OwnedCoursesService {
    constructor(
        private ownedCoursesRepository: OwnedCoursesRepository,
    ) { }

    async getOwnedCoursesWithProgress(userId: bigint, filter?: string | null, sort?: string | null): Promise<OwnedCourseDto[]> {
        return this.ownedCoursesRepository.getOwnedCoursesWithDetails(userId, filter || undefined, sort || undefined);
    }
}
