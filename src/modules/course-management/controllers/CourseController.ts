import { CourseService } from '../services/CourseService';
import { ContentManagementService } from '../services/ContentManagementService';
import { LearnService } from '../services/LearnService';
import { CourseRepository } from '../repositories/CourseRepository';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { CourseListDto } from '../dtos/CourseListDto';
import { CourseDetailDto, PublicCourseDto } from '../dtos/CourseDetailDto';
import { prisma } from '../../../shared/config/database';

export class CourseController {
    private service: CourseService;
    private contentService: ContentManagementService;

    constructor() {
        const courseRepo = new CourseRepository(prisma);
        const progressRepo = new LearningProgressRepository(prisma);
        const learnService = new LearnService(progressRepo, prisma);
        this.service = new CourseService(courseRepo, learnService);
        this.contentService = new ContentManagementService(courseRepo, prisma);
    }

    async getCourses(search?: string): Promise<CourseListDto[]> {
        return await this.service.getCourses(search);
    }

    async getCourseDetail(courseId: bigint, userId?: bigint): Promise<CourseDetailDto | null> {
        return await this.service.getCourseDetail(courseId, userId);
    }

    async getCourseByShareToken(token: string): Promise<PublicCourseDto> {
        return await this.contentService.getPublicCourseByToken(token);
    }

    async cloneSharedCourse(token: string, userId: bigint): Promise<bigint> {
        return await this.contentService.cloneSharedCourse(token, userId);
    }
}
