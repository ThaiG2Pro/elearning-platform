import api from './api';
import { AuthUtils } from './auth';
import { MyLearningCoursesResponse, Lesson, LessonProgress, QuizSession, QuizResult, LessonNote } from '@/types/course.types';

export const getMyLearningCourses = async (filter?: 'in_progress' | 'completed'): Promise<MyLearningCoursesResponse> => {
    try {
        const params = filter ? { filter } : {};
        const response = await api.get('/courses/owned', { params });
        return response.data as MyLearningCoursesResponse;
    } catch (error: any) {
        if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (error.response?.status === 403) {
            throw new Error('Tài khoản của bạn không có quyền học viên.');
        }
        throw new Error('Hệ thống không thể tải danh sách khóa học lúc này.');
    }
};

export const getLessons = async (courseId: string): Promise<Lesson[]> => {
    try {
        const response = await api.get(`/courses/${courseId}/lessons`);
        return response.data as Lesson[];
    } catch (error: any) {
        throw new Error('Không thể tải danh sách bài học.');
    }
};

export const getLessonProgress = async (lessonId: string): Promise<LessonProgress> => {
    try {
        const response = await api.get(`/lessons/${lessonId}/progress`);
        return response.data as LessonProgress;
    } catch (error: any) {
        throw new Error('Không thể tải tiến độ bài học.');
    }
};

export const updateLessonProgress = async (lessonId: string, currentPosition: number, duration: number): Promise<LessonProgress> => {
    try {
        const response = await api.post(`/lessons/${lessonId}/progress`, { position: currentPosition, duration });
        return response.data as LessonProgress;
    } catch (error: any) {
        throw new Error('Không thể cập nhật tiến độ.');
    }
};

/**
 * WP1.5.13 — flush used specifically for "the page/tab is going away right
 * now" (beforeunload/pagehide), not for normal periodic syncing. A regular
 * axios/XHR call started at that moment can be silently aborted by the
 * browser before it ever reaches the network, dropping the last watch
 * position for good. `fetch(..., { keepalive: true })` tells the browser to
 * finish the request in the background after the page unloads — unlike
 * navigator.sendBeacon, it still lets us set the Authorization header this
 * API requires, at the cost of a small body-size cap we're nowhere near.
 * Fire-and-forget by design: there's no UI left to react to the result.
 */
export const flushLessonProgress = (lessonId: string, currentPosition: number, duration: number): void => {
    try {
        const token = AuthUtils.getAccessToken();
        const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        fetch(`${baseURL}/lessons/${lessonId}/progress`, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ position: currentPosition, duration }),
        }).catch(() => { /* best-effort — nothing left to recover here */ });
    } catch {
        // e.g. fetch/keepalive unsupported — still best-effort
    }
};

export const startQuiz = async (lessonId: string): Promise<QuizSession> => {
    try {
        const response = await api.post(`/lessons/${lessonId}/quiz/start`);
        return response.data as QuizSession;
    } catch (error: any) {
        if (error.response?.data?.code === 'QUIZ_TIME_EXPIRED') {
            throw new Error('Thời gian làm bài đã kết thúc. Hệ thống đang tự động nộp bài.');
        }
        if (error.response?.data?.error === 'NO_QUESTIONS_FOUND') {
            throw new Error('Bài kiểm tra này chưa có câu hỏi nào. Vui lòng liên hệ người tạo khóa học.');
        }
        throw new Error('Không thể bắt đầu bài kiểm tra.');
    }
};

export const submitQuiz = async (lessonId: string, sessionId: string, answers: Record<string, string>): Promise<QuizResult> => {
    try {
        const response = await api.post(`/lessons/${lessonId}/quiz/submit`, { sessionId, answers });
        return response.data as QuizResult;
    } catch (error: any) {
        throw new Error('Không thể nộp bài kiểm tra.');
    }
};

// WP1.5.4: a lesson can now have many notes, each optionally pinned to a
// video timestamp — replaces the old single save/get-note pair.
export const addLessonNote = async (lessonId: string, content: string, videoTimestampSec: number | null): Promise<LessonNote> => {
    try {
        const response = await api.post(`/lessons/${lessonId}/notes`, { content, videoTimestampSec });
        return response.data as LessonNote;
    } catch (error: any) {
        throw new Error('Không thể lưu ghi chú.');
    }
};

export const getLessonNotes = async (lessonId: string): Promise<LessonNote[]> => {
    try {
        const response = await api.get(`/lessons/${lessonId}/notes`);
        return response.data as LessonNote[];
    } catch (error: any) {
        return [];
    }
};

export const deleteLessonNote = async (lessonId: string, noteId: string): Promise<void> => {
    try {
        await api.delete(`/lessons/${lessonId}/notes/${noteId}`);
    } catch (error: any) {
        throw new Error('Không thể xoá ghi chú.');
    }
};
