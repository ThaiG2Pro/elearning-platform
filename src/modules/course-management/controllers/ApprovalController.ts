import { ApprovalService } from '../services/ApprovalService';
import { CourseRepository } from '../repositories/CourseRepository';
import { ModerateCourseDto } from '../dtos/ModerateCourseDto';
import { PendingCourseDto } from '../services/ContentManagementService';
import { prisma } from '../../../shared/config/database';

export class ApprovalController {
    private service: ApprovalService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        this.service = new ApprovalService(courseRepo);
    }

    async moderateCourse(adminId: bigint, courseId: bigint, dto: ModerateCourseDto) {
        await this.service.moderateCourse(adminId, courseId, dto);
    }

    async getPendingCourses(): Promise<PendingCourseDto[]> {
        return await this.service.getPendingCourses();
    }
}
