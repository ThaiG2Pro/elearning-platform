import { Enrollment } from './Enrollment';

export class EnrollmentFactory {
    static createEnrollment(studentId: bigint, courseId: bigint): Enrollment {
        return Enrollment.create(studentId, courseId);
    }
}
