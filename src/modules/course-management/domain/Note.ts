export class Note {
    constructor(
        public id: bigint | null,
        public enrollmentId: bigint,
        public lessonId: bigint,
        public content: string,
        public createdAt: Date,
        public updatedAt: Date,
    ) { }

    static create(enrollmentId: bigint, lessonId: bigint, content: string): Note {
        const now = new Date();
        return new Note(null, enrollmentId, lessonId, content, now, now);
    }

    updateContent(content: string): void {
        this.content = content;
        this.updatedAt = new Date();
    }
}
