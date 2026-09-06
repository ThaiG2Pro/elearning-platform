export class SpaceListDto {
    constructor(
        public id: number,
        public title: string,
        public slug: string,
        public description: string | null,
        public thumbnailUrl?: string,
        public isShowcase?: boolean,
        public cloneCount?: number,
        // UI (2026-09-05) — set khi chính space này là 1 bản clone/fork, để
        // card hiện "Bản sao của <ownerName>" phân biệt với bản gốc chính chủ.
        public clonedFrom?: { spaceId: number; ownerName: string } | null,
    ) { }
}
