import { Course } from './Course';

export class AccessControlPolicy {
    static validateOwnership(userId: bigint, ownerId: bigint) {
        if (userId !== ownerId) {
            throw new Error('ACCESS_DENIED');
        }
    }

    static validateOwnershipAndState(userId: bigint, course: Course) {
        this.validateOwnership(userId, course.lecturerId);
        if (course.status !== 'DRAFT') {
            throw new Error('COURSE_NOT_DRAFT');
        }
    }
}
