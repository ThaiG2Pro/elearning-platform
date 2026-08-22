export class CreateSpaceDto {
    constructor(
        public title: string,
        public description?: string,
    ) { }
}

export class SpaceSummaryDto {
    constructor(
        public id: bigint,
        public title: string,
        public status: string,
        public thumbnailUrl?: string,
        // WP1.10.6 — badge "N bài" trên card /my-spaces, phân biệt hình thái
        // (1 video vs nhiều chương/bài) không cần tab/lọc riêng theo nguồn.
        public lessonCount?: number,
    ) { }
}
