export interface BulkVideoLessonDto {
    chapterId: number;
    title: string;
    videoUrl: string;
    orderIndex: number;
}

export interface BulkCourseContentDto {
    lessons: BulkVideoLessonDto[];
}
