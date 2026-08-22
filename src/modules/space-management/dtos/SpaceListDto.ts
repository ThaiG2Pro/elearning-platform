export class SpaceListDto {
    constructor(
        public id: number,
        public title: string,
        public slug: string,
        public description: string | null,
        public thumbnailUrl?: string,
        public isShowcase?: boolean,
        public cloneCount?: number,
    ) { }
}
