export class Enrollment {
    constructor(
        public id: bigint | null,
        public studentId: bigint,
        public courseId: bigint,
        public completionRate: number,
        public enrolledAt: Date,
    ) { }

    static create(studentId: bigint, courseId: bigint): Enrollment {
        return new Enrollment(
            null,
            studentId,
            courseId,
            0, // completionRate
            new Date()
        );
    }
}
