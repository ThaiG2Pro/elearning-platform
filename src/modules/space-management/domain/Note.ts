export class Note {
    constructor(
        public id: bigint | null,
        public userId: bigint,
        public spaceId: bigint,
        public lessonId: bigint,
        public content: string,
        // WP1.5.4: optional video-position marker — a note taken while
        // watching can be pinned to the second it was written at, so the UI
        // can seek the player back there on click. `null` for notes not tied
        // to a specific moment.
        public videoTimestampSec: number | null,
        public createdAt: Date,
        public updatedAt: Date,
    ) { }

    static create(userId: bigint, spaceId: bigint, lessonId: bigint, content: string, videoTimestampSec: number | null): Note {
        const now = new Date();
        return new Note(null, userId, spaceId, lessonId, content, videoTimestampSec, now, now);
    }
}
