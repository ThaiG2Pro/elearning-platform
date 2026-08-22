import { OwnedSpacesService } from '../services/OwnedSpacesService';
import { OwnedSpacesRepository } from '../repositories/OwnedSpacesRepository';
import { prisma } from '../../../shared/config/database';

// WP1.6 follow-up (round 2) — renamed from EnrollmentController: this is the
// read path behind /my-learning and the homepage "continue learning" strip,
// listing spaces the user owns together with their progress. Nothing here
// is enrollment-shaped anymore.
export class OwnedSpacesController {
    private service: OwnedSpacesService;

    constructor() {
        const ownedSpacesRepo = new OwnedSpacesRepository(prisma);
        this.service = new OwnedSpacesService(ownedSpacesRepo);
    }

    async getOwnedSpacesWithProgress(userId: bigint, filter?: string | null, sort?: string | null): Promise<any[]> {
        return await this.service.getOwnedSpacesWithProgress(userId, filter, sort);
    }
}
