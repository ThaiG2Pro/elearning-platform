export class CourseListDto {
    constructor(
        public id: number,
        public title: string,
        public slug: string,
        public description: string | null,
        public thumbnailUrl?: string,
    ) { }
}
