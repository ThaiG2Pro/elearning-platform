export interface OwnedCourseDto {
    id: number;
    title: string;
    slug: string;
    status: string;
    thumbnailUrl?: string;
    completionRate: number;
    createdAt: Date;
}
