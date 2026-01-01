import { CourseRepository } from '../repositories/CourseRepository';
import { PublishingPolicy } from '../domain/PublishingPolicy';
import { ModerateCourseDto } from '../dtos/ModerateCourseDto';
import { PendingCourseDto } from './ContentManagementService';

export class ApprovalService {
    constructor(private courseRepository: CourseRepository) { }

    async moderateCourse(_adminId: bigint, courseId: bigint, dto: ModerateCourseDto) {
        const course = await this.courseRepository.findById(courseId);
        if (!course) throw new Error('COURSE_NOT_FOUND');

        PublishingPolicy.validateModerationEligibility(course.status);

        if (dto.action === 'APPROVE') {
            course.approve();
        } else if (dto.action === 'REJECT') {
            PublishingPolicy.validateRejectNote(dto.rejectNote || '');
            course.reject(dto.rejectNote || '');
        } else {
            throw new Error('INVALID_ACTION');
        }

        await this.courseRepository.save(course);
    }

    async getPendingCourses(): Promise<PendingCourseDto[]> {
        const courses = await this.courseRepository.findPendingCourses();
        return courses.map(course => ({
            id: course.id!,
            title: course.title,
            lecturerName: course.lecturerName,
            submittedAt: course.submittedAt
        }));
    }
}
