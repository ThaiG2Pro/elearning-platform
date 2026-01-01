export interface ModerateCourseDto {
    action: 'APPROVE' | 'REJECT';
    rejectNote?: string;
}
