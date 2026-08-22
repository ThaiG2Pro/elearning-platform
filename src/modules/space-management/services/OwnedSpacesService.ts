import { OwnedSpacesRepository } from '../repositories/OwnedSpacesRepository';
import { OwnedSpaceDto } from '../dtos/OwnedSpaceDto';

// WP1.6.3 — enrollStudent/checkEnrollmentStatus (the marketplace-style
// STUDENT-enrolls-in-LECTURER's-space write path) were removed: zero UI
// callers anywhere in src/app (confirmed by grep), dead since the ownership
// pivot (WP0.2) made space access owner_id-based instead. Keeping a
// functioning-but-unused write path around is a trap — a future UI/AI
// change could wire it back up and silently reintroduce a second,
// disconnected "enrolled" concept alongside owner_id. getOwnedSpacesWithProgress
// is the one read path still in real use (/my-learning, the homepage's
// "học tiếp" strip) and it no longer touches the `enrollments` table at all
// — see OwnedSpacesRepository.getOwnedSpacesWithDetails.
//
// WP1.6 follow-up (round 2) — renamed from EnrollmentService: nothing here
// deals with "enrollment" anymore, it's the read path for a user's owned
// spaces annotated with learning progress.
export class OwnedSpacesService {
    constructor(
        private ownedSpacesRepository: OwnedSpacesRepository,
    ) { }

    async getOwnedSpacesWithProgress(userId: bigint, filter?: string | null, sort?: string | null): Promise<OwnedSpaceDto[]> {
        return this.ownedSpacesRepository.getOwnedSpacesWithDetails(userId, filter || undefined, sort || undefined);
    }
}
