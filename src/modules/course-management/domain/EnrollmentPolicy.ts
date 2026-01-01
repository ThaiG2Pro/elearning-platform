import { Course } from './Course';

export class EnrollmentPolicy {
    static validateCourseAvailability(course: Course | null): Course {
        if (!course) {
            throw new Error('COURSE_NOT_FOUND');
        }

        if (course.status !== 'ACTIVE') {
            throw new Error('COURSE_NOT_AVAILABLE');
        }

        return course;
    }
}
