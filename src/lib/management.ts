// src/lib/management.ts

import api from './api';
import { ManagedSpacesResponse, ManagedSpacesRequest, SpaceStructure, LessonPreview, Chapter, QuizParseResponse } from '@/types/management.types';

// WP1.6 follow-up (round 2) — renamed from getLecturerSpaces: lists the
// spaces the current user owns, for the /my-spaces management screen.
export const getOwnedSpaces = async (
    params?: ManagedSpacesRequest
): Promise<ManagedSpacesResponse> => {
    try {
        const response = await api.get<ManagedSpacesResponse>(
            '/management/spaces',
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
                throw new Error('SPACE_NOT_FOUND');
            } else {
                throw new Error('SERVER_ERROR');
            }
        } else {
            throw new Error('NETWORK_ERROR');
        }
    }
};

export const getSpaceStructure = async (spaceId: number): Promise<SpaceStructure> => {
    try {
        const response = await api.get<SpaceStructure>(
            `/spaces/${spaceId}`
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
                throw new Error('SPACE_NOT_FOUND');
            } else {
                throw new Error('SERVER_ERROR');
            }
        } else {
            throw new Error('NETWORK_ERROR');
        }
    }
};

export const getLessonPreview = async (spaceId: number, lessonId: number): Promise<LessonPreview> => {
    try {
        const response = await api.get<LessonPreview>(
            `/management/spaces/${spaceId}/preview/lessons/${lessonId}`
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

// Create a new space
export const createSpace = async (data: { title?: string; description?: string; slug?: string } = {}): Promise<{ id: string; spaceId: string; message?: string }> => {
    try {
        const response = await api.post<{ id?: string | number; spaceId?: string | number; message?: string }>(
            `/management/spaces`,
            data
        );
        const spaceIdStr = String(response.data.spaceId || response.data.id || '');
        return {
            id: spaceIdStr,
            spaceId: spaceIdStr,
            message: response.data.message
        };
    } catch (error: any) {
        if (error.response?.data?.error === 'UNAUTHORIZED') {
            throw new Error('UNAUTHORIZED');
        }
        if (error.response?.status === 400) {
            throw new Error(error.response.data?.error || 'Dữ liệu không hợp lệ');
        }
        throw new Error('Có lỗi xảy ra khi tạo Space.');
    }
};

// Update space metadata (title, description, status)
export const updateSpaceMetadata = async (spaceId: number, data: { title?: string; description?: string; status?: 'ACTIVE' | 'ARCHIVED' }): Promise<void> => {
    try {
        await api.put(`/management/spaces/${spaceId}`, data);
    } catch (error: any) {
        if (error.response?.status === 400) {
            throw new Error(error.response.data?.error || 'Invalid input');
        } else if (error.response?.status === 403) {
            throw new Error('ACCESS_DENIED');
        } else if (error.response?.status === 404) {
            throw new Error('SPACE_NOT_FOUND');
        } else {
            throw new Error('SERVER_ERROR');
        }
    }
};

// WP1.6 follow-up (round 3) — wires up Space.archive()/unarchive(), which
// existed in the domain since the ownership pivot but had no route/UI ever
// calling them, leaving the /my-spaces "Archived" filter permanently empty.
export const archiveSpace = async (spaceId: number): Promise<void> => {
    await updateSpaceMetadata(spaceId, { status: 'ARCHIVED' });
};

export const unarchiveSpace = async (spaceId: number): Promise<void> => {
    await updateSpaceMetadata(spaceId, { status: 'ACTIVE' });
};

// Section (Chapter) CRUD
export const createSection = async (spaceId: number, data: { title: string; orderIndex: number }): Promise<Chapter> => {
    try {
        const response = await api.post<Chapter>(
            `/management/spaces/${spaceId}/sections`,
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
// WP1.6 follow-up (space-editor refactor) — `content` dropped: it was
// posted here and in updateLesson below but never had a home on the
// backend (no `content`/description column on `lessons`, see
// prisma/schema.prisma) — CreateLessonDto/UpdateLessonDto never read it.
// The "Mô tả nội dung" textarea that fed it always silently discarded
// whatever the user typed.
// 2026-09-04 — response thật là { lessonId, sourceId }, không phải Lesson
// đầy đủ (route chỉ trả lại 2 field này, xem
// app/api/v1/management/sections/[id]/lessons/route.ts). `sourceId` cần cho
// editor biết lesson VIDEO vừa tạo có nguồn cho AI hay chưa.
export const createLesson = async (sectionId: number, data: { title: string; videoUrl?: string; orderIndex: number; type: 'VIDEO' | 'QUIZ' }): Promise<{ lessonId: number; sourceId: number | null }> => {
    try {
        const response = await api.post<{ lessonId: number; sourceId: number | null }>(
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

// Cùng lý do với createLesson ở trên — route trả { message, sourceId }.
export const updateLesson = async (lessonId: number, data: { title: string; videoUrl?: string; orderIndex?: number }): Promise<{ message: string; sourceId: number | null }> => {
    try {
        const response = await api.put<{ message: string; sourceId: number | null }>(
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
            const { status, data } = error.response;
            // A 400 here almost always carries the actual, specific reason
            // (row-level ExcelInvalidException message + row number) — the
            // old code discarded it and threw a fixed 'INVALID_FILE_FORMAT'
            // string, so a lecturer whose file failed on row 7 for a
            // specific reason only ever saw "Định dạng tệp không hợp lệ"
            // with no way to know which row or why.
            if (status === 400) throw new Error(data?.details ? `${data.details}` : (data?.error || 'INVALID_FILE_FORMAT'));
            else if (status === 413) throw new Error('FILE_TOO_LARGE');
            else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Downloads the sample quiz Excel template. Fetched as a blob (rather than a
// plain `<a href>` to the API route) because auth here is a Bearer JWT from
// localStorage attached by the axios interceptor (see api.ts) — a bare
// anchor tag's browser-initiated GET carries no Authorization header and
// would just 401.
export const downloadQuizTemplate = async (): Promise<void> => {
    try {
        const response = await api.get('/management/quiz/template', {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'mau-cau-hoi-quiz.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        if (error.response?.status === 401) throw new Error('UNAUTHORIZED');
        throw new Error('SERVER_ERROR');
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
            const { status, data } = error.response;
            // Same fix as parseQuizFile above — the upload route reports
            // EMPTY_QUIZ_FILE / INVALID_EXCEL_FORMAT (with the specific row
            // reason) in `message`, which was previously discarded in favor
            // of a fixed 'INVALID_FILE_FORMAT' string.
            if (status === 400) throw new Error(data?.message || data?.error || 'INVALID_FILE_FORMAT');
            else if (status === 413) throw new Error('FILE_TOO_LARGE');
            else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// JSON counterpart of uploadQuizFile — dùng bởi luồng "AI tạo quiz" trong
// editor (thay vì bắt user tự xuất ra Excel để tái dùng đường upload sẵn có).
export const saveGeneratedQuizQuestions = async (
    lessonId: number,
    questions: { content: string; options: string[]; correctAnswer: string }[]
): Promise<{ savedCount: number }> => {
    try {
        const response = await api.post<{ savedCount: number }>(
            `/management/lessons/${lessonId}/quiz/questions`,
            { questions }
        );
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 400) throw new Error(data?.message || data?.error || 'INVALID_QUESTIONS');
            else if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('LESSON_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// Update full space content (sections & lessons)
export const updateSpaceContent = async (spaceId: number, payload: any): Promise<void> => {
    try {
        await api.put(`/management/spaces/${spaceId}/content`, payload);
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('SPACE_NOT_FOUND');
            else throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// WP1.1 — paste a link, get a fully-formed space in one step
export const createSpaceFromLink = async (url: string): Promise<{ spaceId: string; title: string; titleIsPlaceholder: boolean }> => {
    try {
        const response = await api.post('/management/spaces/from-link', { url });
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            if (data?.error === 'UNSUPPORTED_URL') throw new Error('Hiện chỉ hỗ trợ link YouTube.');
            if (data?.error === 'URL_REQUIRED') throw new Error('Vui lòng nhập link video.');
            // WP1.10.2 — oEmbed thất bại không còn chặn tạo Space (service tự
            // dùng title tạm), nên YOUTUBE_METADATA_FETCH_FAILED không còn
            // xảy ra ở đây nữa; PLAYLIST_URL_NOT_SUPPORTED là lỗi mới thay vào.
            if (data?.error === 'PLAYLIST_URL_NOT_SUPPORTED') throw new Error('Chưa hỗ trợ playlist — dán link từng video.');
            throw new Error('SERVER_ERROR');
        } else throw new Error('NETWORK_ERROR');
    }
};

// WP1.4 — owner-only: get (and lazily create) the space's stable share link
export const getOrCreateShareLink = async (spaceId: number): Promise<{ shareToken: string; shareUrl: string }> => {
    try {
        const response = await api.post(`/management/spaces/${spaceId}/share`);
        return response.data;
    } catch (error: any) {
        if (error.response) {
            const { status } = error.response;
            if (status === 401) throw new Error('UNAUTHORIZED');
            else if (status === 403) throw new Error('ACCESS_DENIED');
            else if (status === 404) throw new Error('SPACE_NOT_FOUND');
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

// WP1.5.11 — "quản lý share link của tôi": list every owned space with its
// current share status (previously the only way to see a link again was the
// orphaned lecturer/spaces/[id]/view page, now /my-spaces/[id]/view).
export const listMyShareLinks = async (): Promise<MyShareLink[]> => {
    try {
        const response = await api.get('/management/spaces/share');
        return response.data;
    } catch (error: any) {
        throw new Error('Không thể tải danh sách link chia sẻ.');
    }
};

export const revokeShareLink = async (spaceId: number): Promise<void> => {
    try {
        await api.delete(`/management/spaces/${spaceId}/share`);
    } catch (error: any) {
        if (error.response?.status === 403) throw new Error('ACCESS_DENIED');
        throw new Error('Không thể thu hồi link.');
    }
};

export interface MySharedAIGeneration {
    id: string;
    recipeType: 'summary' | 'quiz';
    createdAt: string;
    reuseCount: number;
    sourceId: string;
    sourceTitle: string | null;
    sourceUrl: string;
}

// 2026-09-05 — "/my-ai-shares": danh sách bản AI (quiz/tóm tắt) đã tạo bằng
// BYOK và đang SHARED — điểm chạm quản lý còn thiếu sau khi feature share
// BYOK ra mắt (chỉ có checkbox lúc generate, không có nơi xem/thu hồi lại).
export const listMySharedAIGenerations = async (): Promise<MySharedAIGeneration[]> => {
    try {
        const response = await api.get('/management/ai-generations');
        return response.data.items;
    } catch (error: any) {
        throw new Error('Không thể tải danh sách AI đã chia sẻ.');
    }
};

export const revokeAIGenerationShare = async (generationId: string): Promise<void> => {
    try {
        await api.delete(`/management/ai-generations/${generationId}/share`);
    } catch (error: any) {
        if (error.response?.status === 403) throw new Error('ACCESS_DENIED');
        if (error.response?.status === 404) throw new Error('AI_GENERATION_NOT_FOUND');
        throw new Error('Không thể thu hồi chia sẻ.');
    }
};
