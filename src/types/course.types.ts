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
    ownerName?: string;
    isOwner: boolean;
    thumbnailUrl?: string;
    chapters: any[]; // TODO: Define chapter type
    completionRate?: number; // WP1.3 — % of lessons finished by the logged-in user
    shareToken?: string;
}

// WP1.6 follow-up (round 2) — renamed from EnrolledCourse: this is a course
// the user owns, annotated with their own learning progress, for the
// /my-learning screen and the homepage "continue learning" strip. It was
// never actually enrollment-shaped once the ownership pivot landed.
export interface MyLearningCourse {
    id: string;
    title: string;
    completionRate: number; // 0-100
    // WP1.6.4 — 'not_started' split out from 'in_progress': a course with
    // very few lessons can only show completionRate 0 or 100, so "started
    // watching but haven't finished a lesson yet" needs its own state,
    // separate from "never opened at all".
    status: 'not_started' | 'in_progress' | 'completed';
    createdAt: string; // ISO date string
    thumbnailUrl?: string;
    // Only present when status is 'in_progress' and completionRate is still
    // 0 — seconds into the current lesson's video, for an honest "đã xem
    // 3:20" readout instead of a misleading flat 0%.
    lastWatchedPositionSec?: number;
    // WP1.10.6 — badge "N bài" trên card, phân biệt hình thái (1 video vs
    // nhiều chương/bài) không cần tab/lọc riêng theo nguồn.
    lessonCount: number;
}

export interface MyLearningCoursesResponse {
    courses: MyLearningCourse[];
}

export interface Lesson {
    id: string;
    title: string;
    type: 'video' | 'quiz';
    videoUrl?: string;
    duration?: number; // in seconds
    order: number;
    isCompleted: boolean;
    chapterId?: string;
    chapterTitle?: string;
    chapterOrder?: number;
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
    isPassed: boolean;
    questions: QuizQuestion[];
    submittedAt: string;
}

/** WP1.5.4: a lesson can have many notes, each optionally pinned to a video timestamp. */
export interface LessonNote {
    id: string;
    content: string;
    videoTimestampSec: number | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * WP1.7 — one member of a course's clone lineage (owner-authored root +
 * everyone who cloned it), with their own progress on their own copy.
 */
export interface Companion {
    courseId: number;
    name: string;
    completionRate: number;
    isSelf: boolean;
}

/** WP1.4 — anonymous-visitor view of a course reached via /share/[token]. */
export interface PublicCourse {
    id: number;
    title: string;
    description?: string | null;
    ownerName?: string | null;
    thumbnailUrl?: string;
    shareToken?: string;
    chapters: {
        id: number;
        title: string;
        lessons: {
            id: number;
            title: string;
            type: string;
            orderIndex: number;
            contentUrl?: string;
        }[];
    }[];
}
