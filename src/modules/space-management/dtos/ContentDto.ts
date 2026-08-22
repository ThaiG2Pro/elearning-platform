export class CreateSectionDto {
    constructor(
        public title: string,
        public orderIndex: number,
    ) { }
}

export class UpdateSectionDto {
    constructor(
        public title?: string,
        public orderIndex?: number,
    ) { }
}

export class SectionDto {
    constructor(
        public id: bigint,
        public title: string,
        public orderIndex: number,
        public lessons: LessonDto[],
    ) { }
}

export class CreateLessonDto {
    constructor(
        public title: string,
        public type: string, // 'video' | 'quiz'
        public orderIndex: number,
        public contentUrl?: string,
    ) { }
}

export class UpdateLessonDto {
    constructor(
        public title?: string,
        public contentUrl?: string,
        public orderIndex?: number,
    ) { }
}

export class LessonDto {
    constructor(
        public id: bigint,
        public title: string,
        public type: string,
        public orderIndex: number,
        public contentUrl?: string,
    ) { }
}
