import { Chapter } from './Chapter';

/**
 * Personal-organizer model (post Checkpoint-0 pivot): a space is active the
 * moment its owner creates it — no admin approval, no DRAFT/PENDING/REJECTED
 * gate. The only lifecycle state left is whether the owner has archived it.
 */
export enum SpaceStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
}

export class Space {
    constructor(
        public id: bigint | null,
        public ownerId: bigint,
        public title: string,
        public slug: string,
        public description: string | null,
        public status: SpaceStatus = SpaceStatus.ACTIVE,
        public chapters: Chapter[] = [],
        public shareToken?: string | null,
    ) { }

    archive() {
        this.status = SpaceStatus.ARCHIVED;
    }

    unarchive() {
        this.status = SpaceStatus.ACTIVE;
    }
}
