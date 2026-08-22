import { Lesson } from './Lesson';

export class Chapter {
    constructor(
        public id: bigint | null,
        public spaceId: bigint,
        public title: string,
        public orderIndex: number,
        public lessons: Lesson[] = [],
    ) { }
}
