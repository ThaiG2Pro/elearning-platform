export interface Course {
    id: number;
    title: string;
    slug: string;
    description?: string;
    thumbnailUrl?: string;
}

export type CourseListResponse = Course[];
export interface CourseDetail {
    id: number;
    title: string;
    slug: string;
    description?: string;
    lecturerName?: string;
    isEnrolled: boolean;
    thumbnailUrl?: string;
    chapters: any[]; // TODO: Define chapter type
}

export interface EnrollResponse {
    enrollmentId: number;
    message: string;
}

export interface EnrolledCourse {
    id: string;
    title: string;
    completionRate: number; // 0-100
    status: 'in_progress' | 'completed';
    enrolledAt: string; // ISO date string
    thumbnailUrl?: string;
}

export interface EnrolledCoursesResponse {
    courses: EnrolledCourse[];
}

export interface Lesson {
    id: string;
    title: string;
    type: 'video' | 'quiz';
    videoUrl?: string;
    duration?: number; // in seconds
    order: number;
    isCompleted: boolean;
}

export interface LessonProgress {
    lessonId: string;
    currentPosition: number; // in seconds for video
    isCompleted: boolean;
    lastAccessedAt: string;
}

export interface QuizQuestion {
    id: string;
    text: string;
    options: {
        id: string;
        text: string;
    }[];
    selectedId?: string;
    correctId?: string;
}

export interface QuizSession {
    sessionId: string;
    questions: QuizQuestion[];
    expiresAt: string; // ISO date string
    score?: number;
    submittedAt?: string;
}

export interface QuizResult {
    score: number;
    questions: QuizQuestion[];
    submittedAt: string;
}

export interface LessonNote {
    content: string;
    updatedAt: string;
}
