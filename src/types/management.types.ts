// src/types/management.types.ts

// WP1.6 follow-up (round 2) — renamed from LecturerCourse: the /my-courses
// management screen (formerly /lecturer/courses) lists courses by
// ownership, not a lecturer role — every user manages their own.
export interface ManagedCourse {
    id: number;
    title: string;
    status: 'Active' | 'Archived';
    thumbnailUrl?: string;
    createdAt?: string; // optional because API might not provide it
}

export interface ManagedCoursesResponse {
    courses: ManagedCourse[];
}

export interface ManagedCoursesRequest {
    status?: 'Active' | 'Archived';
}

export interface Lesson {
    id: number;
    title: string;
    type: 'VIDEO' | 'QUIZ';
    orderIndex: number;
    content?: string;
    videoUrl?: string;
}

export interface Chapter {
    id: number;
    title: string;
    orderIndex: number;
    lessons: Lesson[];
}

export interface CourseStructure {
    id: number;
    title: string;
    slug: string;
    description?: string;
    ownerName?: string;
    isOwner: boolean;
    thumbnailUrl?: string;
    chapters: Chapter[];
    // WP1.5.10: 'Draft'/'Pending' dropped — no route creates that state
    // anymore, courses are active for their owner immediately.
    status: 'Active';
}

export interface QuizQuestion {
    id: number;
    // backend may provide either `text` or `content`
    text?: string;
    content?: string;
    options: string[];
    // backend may return correct answer in different shapes
    correctId?: number | string; // e.g., 0 or 'option_0'
    correctIndex?: number; // numeric index
    answerKey?: string; // e.g., 'A','B' etc
}

export interface LessonPreview {
    id: number;
    title: string;
    type: 'VIDEO' | 'QUIZ';
    content: string;
    videoUrl?: string;
    quizQuestions?: QuizQuestion[];
}

export interface LessonEdit {
    id?: number;
    title: string;
    content: string;
    videoUrl?: string;
    orderIndex: number;
    type: 'VIDEO' | 'QUIZ';
}

export interface ChapterEdit {
    id?: number;
    title: string;
    orderIndex: number;
}

export interface QuizParseResponse {
    questions: QuizQuestion[];
}

export interface PublishValidation {
    errors: string[];
}
