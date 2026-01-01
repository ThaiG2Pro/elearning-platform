// src/lib/lecturer.ts

import api from './api';
import { LecturerCoursesResponse, LecturerCoursesRequest, CourseStructure, LessonPreview, Chapter, Lesson, QuizParseResponse, PublishValidation } from '@/types/lecturer.types';

export const getLecturerCourses = async (
    params?: LecturerCoursesRequest
): Promise<LecturerCoursesResponse> => {
    try {
        const response = await api.get<LecturerCoursesResponse>(
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

export const uploadQuizFile = async (lessonId: number, file: File): Promise<void> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(
            `/management/lessons/${lessonId}/quiz/upload`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
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
