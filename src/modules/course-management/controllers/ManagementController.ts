import { LearnService } from '../services/LearnService';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { ProgressResult } from '../dtos/ProgressResult';
import { ContentManagementService } from '../services/ContentManagementService';
import { CourseRepository } from '../repositories/CourseRepository';
import { CreateCourseDto, CourseSummaryDto } from '../dtos/CourseManagementDto';
import { CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto } from '../dtos/ContentDto';
import { ModerateCourseDto, PendingCourseDto, LessonPreviewDto } from '../services/ContentManagementService';
import { prisma } from '../../../shared/config/database';

export interface TrackProgressDto {
    lessonId: number;
    position: number;
    duration: number;
    isPreview: boolean;
}

export class ManagementController {
    private learnService: LearnService;
    private contentService: ContentManagementService;

    constructor() {
        const progressRepo = new LearningProgressRepository(prisma);
        const enrollmentRepo = new EnrollmentRepository(prisma);
        this.learnService = new LearnService(progressRepo, enrollmentRepo, prisma);

        const courseRepo = new CourseRepository(prisma);
        this.contentService = new ContentManagementService(courseRepo, prisma);
    }

    async trackVideoProgress(userId: bigint, dto: TrackProgressDto): Promise<ProgressResult> {
        return await this.learnService.trackVideoProgress(
            userId,
            BigInt(dto.lessonId),
            dto.position,
            dto.duration,
            dto.isPreview
        );
    }

    // Course Management
    async getLecturerCourses(lecturerId: bigint, status?: string | null): Promise<CourseSummaryDto[]> {
        return await this.contentService.getLecturerCourses(lecturerId, status);
    }

    async createCourse(lecturerId: bigint, dto: CreateCourseDto): Promise<bigint> {
        return await this.contentService.createCourse(lecturerId, dto);
    }

    // Section Management
    async getCourseSections(courseId: bigint): Promise<SectionDto[]> {
        return await this.contentService.getCourseSections(courseId);
    }

    async createSection(courseId: bigint, dto: CreateSectionDto): Promise<bigint> {
        return await this.contentService.createSection(courseId, dto);
    }

    async updateSection(sectionId: bigint, dto: UpdateSectionDto): Promise<void> {
        await this.contentService.updateSection(sectionId, dto);
    }

    // Lesson Management
    async createLesson(sectionId: bigint, dto: CreateLessonDto): Promise<bigint> {
        return await this.contentService.createLesson(sectionId, dto);
    }

    async updateLesson(lessonId: bigint, dto: UpdateLessonDto): Promise<void> {
        await this.contentService.updateLesson(lessonId, dto);
    }

    async deleteLesson(lessonId: bigint): Promise<void> {
        await this.contentService.deleteLesson(lessonId);
    }

    // Publishing & Moderation
    async submitForApproval(lecturerId: bigint, courseId: bigint): Promise<void> {
        await this.contentService.submitForApproval(lecturerId, courseId);
    }

    async getPendingCourses(): Promise<PendingCourseDto[]> {
        return await this.contentService.getPendingCourses();
    }

    async moderateCourse(adminId: bigint, courseId: bigint, dto: ModerateCourseDto): Promise<void> {
        await this.contentService.moderateCourse(adminId, courseId, dto);
    }

    async getLessonPreview(courseId: bigint, lessonId: bigint, user?: { id: bigint; role: string }): Promise<LessonPreviewDto> {
        return await this.contentService.getLessonPreview(courseId, lessonId, user);
    }
}
