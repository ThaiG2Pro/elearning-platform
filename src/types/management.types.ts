// src/types/management.types.ts

// WP1.6 follow-up (round 2) — renamed from LecturerSpace: the /my-spaces
// management screen (formerly /lecturer/spaces) lists spaces by
// ownership, not a lecturer role — every user manages their own.
export interface ManagedSpace {
    id: number;
    title: string;
    status: 'Active' | 'Archived';
    thumbnailUrl?: string;
    createdAt?: string; // optional because API might not provide it
    // WP1.10.6 — badge "N bài" trên card, phân biệt hình thái (1 video vs
    // nhiều chương/bài) không cần tab/lọc riêng theo nguồn.
    lessonCount?: number;
}

export interface ManagedSpacesResponse {
    spaces: ManagedSpace[];
}

export interface ManagedSpacesRequest {
    status?: 'Active' | 'Archived';
}

export interface Lesson {
    id: number;
    title: string;
    type: 'VIDEO' | 'QUIZ';
    orderIndex: number;
    content?: string;
    videoUrl?: string;
    // Đã có sẵn trong response thật của GET /spaces/[id] (LessonDto.sourceId,
    // WP2.3) nhưng chưa từng được khai báo ở type FE này. Editor
    // (`/my-spaces/[id]/edit`) đọc field này để biết lesson VIDEO nào có
    // nguồn cho AI tóm tắt/tạo quiz (AILessonComposer + lesson editor —
    // từ 2026-08-21 trang edit là nơi duy nhất trigger AI).
    sourceId?: number | null;
}

export interface Chapter {
    id: number;
    title: string;
    orderIndex: number;
    lessons: Lesson[];
}

export interface SpaceStructure {
    id: number;
    title: string;
    slug: string;
    description?: string;
    ownerName?: string;
    isOwner: boolean;
    thumbnailUrl?: string;
    chapters: Chapter[];
    // WP1.5.10: 'Draft'/'Pending' dropped — no route creates that state
    // anymore, spaces are active for their owner immediately.
    // 2026-09-05 — type trước đây chỉ khai 'Active', dù badge trạng thái ở
    // trang edit (my-spaces/[id]/edit) đã luôn xử lý cả 2 nhánh runtime thật
    // (space có thể ARCHIVED — xem ContentManagementService.updateSpaceMetadata)
    // — chỉ là TS chưa từng bắt lỗi vì trước đó không có chỗ nào GÁN giá trị
    // 'Archived' vào field này, chỉ so sánh `===`. Giờ trang edit tự toggle
    // archive tại chỗ (cơ cấu lại 2026-09-05) nên cần khai đúng cả 2 giá trị.
    status: 'Active' | 'Archived';
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
    videoUrl?: string;
    orderIndex: number;
    type: 'VIDEO' | 'QUIZ';
    sourceId?: number | null;
}

export interface ChapterEdit {
    id?: number;
    title: string;
    orderIndex: number;
}

export interface QuizParseResponse {
    questions: QuizQuestion[];
}
