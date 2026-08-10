// src/lib/management.ts

import api from './api';
import { ManagedCoursesResponse, ManagedCoursesRequest, CourseStructure, LessonPreview, Chapter, Lesson, QuizParseResponse, PublishValidation } from '@/types/management.types';

// WP1.6 follow-up (round 2) — renamed from getLecturerCourses: lists the
// courses the current user owns, for the /my-courses management screen.
export const getOwnedCourses = async (
    params?: ManagedCoursesRequest
): Promise<ManagedCoursesResponse> => {
    try {
        const response = await api.get<ManagedCoursesResponse>(
            '/management/courses',
            {
                params,
            }
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) {
                throw new Error('UNAUTHORIZED');
            } else if (status === 403) {
                throw new Error('ACCESS_DENIED');
            } else if (status === 404) {
                throw new Error('COURSE_NOT_FOUND');
            } else {
                throw new Error('SERVER_ERROR');
            }
        } else {
            throw new Error('NETWORK_ERROR');
        }
    }
};

export const getCourseStructure = async (courseId: number): Promise<CourseStructure> => {
    try {
        const response = await api.get<CourseStructure>(
            `/courses/${courseId}`
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) {
                throw new Error('UNAUTHORIZED');
            } else if (status === 403) {
                throw new Error('ACCESS_DENIED');
            } else if (status === 404) {
                throw new Error('COURSE_NOT_FOUND');
            } else {
                throw new Error('SERVER_ERROR');
            }
        } else {
            throw new Error('NETWORK_ERROR');
        }
    }
};

export const getLessonPreview = async (courseId: number, lessonId: number): Promise<LessonPreview> => {
    try {
        const response = await api.get<LessonPreview>(
            `/management/courses/${courseId}/preview/lessons/${lessonId}`
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) {
                throw new Error('UNAUTHORIZED');
            } else if (status === 403) {
                throw new Error('ACCESS_DENIED');
            } else if (status === 404) {
                throw new Error('LESSON_NOT_FOUND');
            } else {
                throw new Error('SERVER_ERROR');
            }
        } else {
            throw new Error('NETWORK_ERROR');
        }
    }
};

// Create a new course (Draft)
export const createCourse = async (data: { title?: string; description?: string; slug?: string } = {}): Promise<{ id: number | string; message?: string }> => {
    try {
        const response = await api.post<{ id: number | string; message?: string }>(
            `/management/courses`,
            data
        );
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 400) {
            throw new Error(error.response.data?.error || 'Invalid input');
        }
        throw new Error('NETWORK_ERROR');
    }
};

// Update course metadata (title, description)
export const updateCourseMetadata = async (courseId: number, data: { title?: string; description?: string }): Promise<void> => {
    try {
        await api.put(`/management/courses/${courseId}`, data);
    } catch (error: any) {
        if (error.response?.status === 400) {
            throw new Error(error.response.data?.error || 'Invalid input');
        } else if (error.response?.status === 403) {
            throw new Error('ACCESS_DENIED');
        } else if (error.response?.status === 404) {
            throw new Error('COURSE_NOT_FOUND');
        } else {
            throw new Error('SERVER_ERROR');
        }
    }
};

// Section (Chapter) CRUD
export const createSection = async (courseId: number, data: { title: string; orderIndex: number }): Promise<Chapter> => {
    try {
        const response = await api.post<Chapter>(
            `/management/courses/${courseId}/sections`,
            data
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export const updateSection = async (sectionId: number, data: { title: string; orderIndex: number }): Promise<Chapter> => {
    try {
        const response = await api.put<Chapter>(
            `/management/sections/${sectionId}`,
            data
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('SECTION_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export const deleteSection = async (sectionId: number): Promise<void> => {
    try {
        await api.delete(
            `/management/sections/${sectionId}`
        );
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('SECTION_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Lesson CRUD
export const createLesson = async (sectionId: number, data: { title: string; content: string; videoUrl?: string; orderIndex: number; type: 'VIDEO' | 'QUIZ' | 'TEXT' }): Promise<Lesson> => {
    try {
        const response = await api.post<Lesson>(
            `/management/sections/${sectionId}/lessons`,
            data
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export const updateLesson = async (lessonId: number, data: { title: string; content: string; videoUrl?: string; orderIndex: number; type: 'VIDEO' | 'QUIZ' | 'TEXT' }): Promise<Lesson> => {
    try {
        const response = await api.put<Lesson>(
            `/management/lessons/${lessonId}`,
            data
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export const deleteLesson = async (lessonId: number): Promise<void> => {
    try {
        await api.delete(
            `/management/lessons/${lessonId}`
        );
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Quiz operations
export const parseQuizFile = async (file: File): Promise<QuizParseResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<QuizParseResponse>(
            '/management/quiz/parse',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 400) throw new Error('INVALID_FILE_FORMAT');
            else if (status === 413) throw new Error('FILE_TOO_LARGE');
            else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export const uploadQuizFile = async (lessonId: number, file: File): Promise<{ uploadedCount: number }> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ uploadedCount: number }>(
            `/management/lessons/${lessonId}/quiz/upload`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 400) throw new Error('INVALID_FILE_FORMAT');
            else if (status === 413) throw new Error('FILE_TOO_LARGE');
            else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Publish course
export const publishCourse = async (courseId: number): Promise<PublishValidation> => {
    try {
        const response = await api.post<PublishValidation>(
            `/management/courses/${courseId}/publish`,
            {}
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 400) {
                return data as PublishValidation; // Return validation errors
            } else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Update full course content (sections & lessons)
export const updateCourseContent = async (courseId: number, payload: any): Promise<void> => {
    try {
        await api.put(`/management/courses/${courseId}/content`, payload);
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('COURSE_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// WP1.1 — paste a link, get a fully-formed course in one step
export const createCourseFromLink = async (url: string): Promise<{ courseId: string }> => {
    try {
        const response = await api.post('/management/courses/from-link', { url });
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            if (data?.error === 'UNSUPPORTED_URL') throw new Error('Hiện chỉ hỗ trợ link YouTube.');
            if (data?.error === 'URL_REQUIRED') throw new Error('Vui lòng nhập link video.');
            if (data?.error === 'YOUTUBE_METADATA_FETCH_FAILED') throw new Error('Không đọc được thông tin video, kiểm tra lại link.');
            throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// WP1.4 — owner-only: get (and lazily create) the course's stable share link
export const getOrCreateShareLink = async (courseId: number): Promise<{ shareToken: string; shareUrl: string }> => {
    try {
        const response = await api.post(`/management/courses/${courseId}/share`);
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('COURSE_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

export interface MyShareLink {
    id: number;
    title: string;
    shareToken: string | null;
    shareUrl: string | null;
}

// WP1.5.11 — "quản lý share link của tôi": list every owned course with its
// current share status (previously the only way to see a link again was the
// orphaned lecturer/courses/[id]/view page, now /my-courses/[id]/view).
export const listMyShareLinks = async (): Promise<MyShareLink[]> => {
    try {
        const response = await api.get('/management/courses/share');
        return response.data;
    } catch (error: any) {
        throw new Error('Không thể tải danh sách link chia sẻ.');
    }
};

export const revokeShareLink = async (courseId: number): Promise<void> => {
    try {
        await api.delete(`/management/courses/${courseId}/share`);
    } catch (error: any) {
        if (error.response?.status === 403) throw new Error('ACCESS_DENIED');
        throw new Error('Không thể thu hồi link.');
    }
};
