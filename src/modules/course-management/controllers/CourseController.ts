import { CourseService } from '../services/CourseService';
import { CourseRepository } from '../repositories/CourseRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { CourseListDto } from '../dtos/CourseListDto';
import { CourseDetailDto } from '../dtos/CourseDetailDto';
import { prisma } from '../../../shared/config/database';

export class CourseController {
    private service: CourseService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        const enrollmentRepo = new EnrollmentRepository(prisma);
        this.service = new CourseService(courseRepo, enrollmentRepo);
    }

    async getCourses(search?: string): Promise<CourseListDto[]> {
        return await this.service.getCourses(search);
    }

    async getCourseDetail(courseId: bigint, userId?: bigint): Promise<CourseDetailDto | null> {
        return await this.service.getCourseDetail(courseId, userId);
    }
}
