import { Chapter } from './Chapter';

/**
 * Personal-organizer model (post Checkpoint-0 pivot): a course is active the
 * moment its owner creates it — no admin approval, no DRAFT/PENDING/REJECTED
 * gate. The only lifecycle state left is whether the owner has archived it.
 */
export enum CourseStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
}

export class Course {
    constructor(
        public id: bigint | null,
        public ownerId: bigint,
        public title: string,
        public slug: string,
        public description: string | null,
        public status: CourseStatus = CourseStatus.ACTIVE,
        public chapters: Chapter[] = [],
        public shareToken?: string | null,
    ) { }

    archive() {
        this.status = CourseStatus.ARCHIVED;
    }

    unarchive() {
        this.status = CourseStatus.ACTIVE;
    }
}
