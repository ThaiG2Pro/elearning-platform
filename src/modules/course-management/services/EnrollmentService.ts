import { CourseRepository } from '../repositories/CourseRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { EnrollmentPolicy } from '../domain/EnrollmentPolicy';
import { EnrollmentFactory } from '../domain/EnrollmentFactory';
import { EnrollResult } from '../dtos/EnrollResult';
import { EnrolledCourseDto } from '../dtos/EnrolledCourseDto';

export class EnrollmentService {
    constructor(
        private courseRepository: CourseRepository,
        private enrollmentRepository: EnrollmentRepository,
    ) { }

    async enrollStudent(userId: bigint, courseId: bigint): Promise<EnrollResult> {
        // Step 1: Validate Course
        const course = await this.courseRepository.findActiveById(courseId);
        EnrollmentPolicy.validateCourseAvailability(course);

        // Step 2: Idempotency Check
        const existingEnrollment = await this.enrollmentRepository.findByStudentAndCourse(userId, courseId);
        if (existingEnrollment) {
            return this.generateEnrollResult(course!.slug);
        }

        // Step 3: Creation (Factory Pattern)
        const newEnrollment = EnrollmentFactory.createEnrollment(userId, courseId);
        await this.enrollmentRepository.save(newEnrollment);

        // Step 4: Response
        return this.generateEnrollResult(course!.slug);
    }

    private generateEnrollResult(courseSlug: string): EnrollResult {
        return {
            redirectUrl: `/learn/${courseSlug}`,
        };
    }

    async checkEnrollmentStatus(userId: bigint, courseId: bigint): Promise<boolean> {
        const enrollment = await this.enrollmentRepository.findByStudentAndCourse(userId, courseId);
        return enrollment !== null;
    }

    async getEnrolledCourses(userId: bigint, filter?: string | null, sort?: string | null): Promise<EnrolledCourseDto[]> {
        return this.enrollmentRepository.getEnrolledCoursesWithDetails(userId, filter || undefined, sort || undefined);
    }
}
