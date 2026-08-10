import { OwnedCoursesService } from '../services/OwnedCoursesService';
import { OwnedCoursesRepository } from '../repositories/OwnedCoursesRepository';
import { prisma } from '../../../shared/config/database';

// WP1.6 follow-up (round 2) — renamed from EnrollmentController: this is the
// read path behind /my-learning and the homepage "continue learning" strip,
// listing courses the user owns together with their progress. Nothing here
// is enrollment-shaped anymore.
export class OwnedCoursesController {
    private service: OwnedCoursesService;

    constructor() {
        const ownedCoursesRepo = new OwnedCoursesRepository(prisma);
        this.service = new OwnedCoursesService(ownedCoursesRepo);
    }

    async getOwnedCoursesWithProgress(userId: bigint, filter?: string | null, sort?: string | null): Promise<any[]> {
        return await this.service.getOwnedCoursesWithProgress(userId, filter, sort);
    }
}
