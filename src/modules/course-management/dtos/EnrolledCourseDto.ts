export interface EnrolledCourseDto {
    id: number;
    title: string;
    slug: string;
    status: string;
    thumbnailUrl?: string;
    completionRate: number;
    enrolledAt: Date;
}
