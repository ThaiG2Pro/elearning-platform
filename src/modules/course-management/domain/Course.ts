import { Chapter } from './Chapter';

export enum CourseStatus {
    DRAFT = 'DRAFT',
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    REJECTED = 'REJECTED',
}

export class Course {
    constructor(
        public id: bigint | null,
        public lecturerId: bigint,
        public title: string,
        public slug: string,
        public description: string | null,
        public status: CourseStatus,
        public rejectNote: string | null,
        public submittedAt?: Date,
        public chapters: Chapter[] = [],
    ) { }

    submit() {
        if (this.status !== CourseStatus.DRAFT) {
            throw new Error('INVALID_STATUS_TRANSITION');
        }
        this.status = CourseStatus.PENDING;
        this.rejectNote = null;
    }

    approve() {
        if (this.status !== CourseStatus.PENDING) {
            throw new Error('INVALID_STATUS_TRANSITION');
        }
        this.status = CourseStatus.ACTIVE;
    }

    reject(note: string) {
        if (this.status !== CourseStatus.PENDING) {
            throw new Error('INVALID_STATUS_TRANSITION');
        }
        this.status = CourseStatus.REJECTED;
        this.rejectNote = note;
    }
}
