import api from './api';
import { EnrolledCoursesResponse, Lesson, LessonProgress, QuizSession, QuizResult, LessonNote } from '@/types/course.types';

export const getEnrolledCourses = async (filter?: 'in_progress' | 'completed'): Promise<EnrolledCoursesResponse> => {
    try {
        const params = filter ? { filter } : {};
        const response = await api.get('/courses/enrolled', { params });
        return response.data as EnrolledCoursesResponse;
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

export const startQuiz = async (lessonId: string): Promise<QuizSession> => {
    try {
        const response = await api.post(`/lessons/${lessonId}/quiz/start`);
        return response.data as QuizSession;
    } catch (error: any) {
        if (error.response?.data?.code === 'QUIZ_TIME_EXPIRED') {
            throw new Error('Thời gian làm bài đã kết thúc. Hệ thống đang tự động nộp bài.');
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

export const saveLessonNote = async (lessonId: string, content: string): Promise<LessonNote> => {
    try {
        const response = await api.put(`/lessons/${lessonId}/notes`, { content });
        return response.data as LessonNote;
    } catch (error: any) {
        if (error.response?.data?.code === 'SAVE_FAILED') {
            throw new Error('Không thể lưu ghi chú. Vui lòng kiểm tra kết nối.');
        }
        throw new Error('Không thể lưu ghi chú.');
    }
};

export const getLessonNote = async (lessonId: string): Promise<LessonNote | null> => {
    try {
        const response = await api.get(`/lessons/${lessonId}/notes`);
        return response.data as LessonNote;
    } catch (error: any) {
        // Note might not exist yet
        return null;
    }
};
