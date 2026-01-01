// src/types/lecturer.types.ts

export interface LecturerCourse {
    id: number;
    title: string;
    status: 'Draft' | 'Pending' | 'Active';
    thumbnailUrl?: string;
    rejectNote?: string;
    createdAt: string;
}

export interface LecturerCoursesResponse {
    courses: LecturerCourse[];
}

export interface LecturerCoursesRequest {
    status?: 'Draft' | 'Pending' | 'Active';
}

export interface Lesson {
    id: number;
    title: string;
    type: 'VIDEO' | 'QUIZ' | 'TEXT';
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
    lecturerName?: string;
    isEnrolled: boolean;
    thumbnailUrl?: string;
    chapters: Chapter[];
    status: 'Draft' | 'Pending' | 'Active';
}

export interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    correctId: number;
}

export interface LessonPreview {
    id: number;
    title: string;
    type: 'VIDEO' | 'QUIZ' | 'TEXT';
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
    type: 'VIDEO' | 'QUIZ' | 'TEXT';
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
