import { EnrollmentService } from '../services/EnrollmentService';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { prisma } from '../../../shared/config/database';

export class EnrollmentController {
    private service: EnrollmentService;

    constructor() {
        const enrollmentRepo = new EnrollmentRepository(prisma);
        this.service = new EnrollmentService(enrollmentRepo);
    }

    async getEnrolledCourses(userId: bigint, filter?: string | null, sort?: string | null): Promise<any[]> {
        return await this.service.getEnrolledCourses(userId, filter, sort);
    }
}
