import { EnrollmentService } from '../services/EnrollmentService';
import { CourseRepository } from '../repositories/CourseRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { EnrollResult } from '../dtos/EnrollResult';
import { prisma } from '../../../shared/config/database';

export class EnrollmentController {
    private service: EnrollmentService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        const enrollmentRepo = new EnrollmentRepository(prisma);
        this.service = new EnrollmentService(courseRepo, enrollmentRepo);
    }

    async enrollStudent(userId: bigint, courseId: bigint): Promise<EnrollResult> {
        return await this.service.enrollStudent(userId, courseId);
    }

    async checkEnrollmentStatus(userId: bigint, courseId: bigint): Promise<boolean> {
        return await this.service.checkEnrollmentStatus(userId, courseId);
    }

    async getEnrolledCourses(userId: bigint, filter?: string | null, sort?: string | null): Promise<any[]> {
        return await this.service.getEnrolledCourses(userId, filter, sort);
    }
}
