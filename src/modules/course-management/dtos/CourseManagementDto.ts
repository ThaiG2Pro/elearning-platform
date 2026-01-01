export class CreateCourseDto {
    constructor(
        public title: string,
        public description?: string,
    ) { }
}

export class CourseSummaryDto {
    constructor(
        public id: bigint,
        public title: string,
        public status: string,
        public thumbnailUrl?: string,
        public rejectNote?: string,
    ) { }
}
