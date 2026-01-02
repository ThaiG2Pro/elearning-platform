export interface BulkLessonDto {
    chapterId: number;
    title: string;
    type?: 'VIDEO' | 'QUIZ';
    contentUrl?: string;
    orderIndex: number;
}

export interface BulkSectionDto {
    id?: number; // optional when new sections are created separately via POST
    title: string;
    orderIndex: number;
    lessons?: BulkLessonDto[];
}

export interface BulkCourseContentDto {
    // Accept either an explicit flat lessons array or structured sections
    lessons?: BulkLessonDto[];
    sections?: BulkSectionDto[];
}
