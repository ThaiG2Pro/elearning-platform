import api from './api';
import { Course, CourseDetail, PublicCourse } from '@/types/course.types';

export const getCourses = async (search?: string): Promise<Course[]> => {
    try {
        const params = search ? { search } : {};
        const response = await api.get('/courses', { params });
        return response.data as Course[];
    } catch (error: any) {
        if (error.response?.data?.error === 'SERVER_ERROR') {
            throw new Error('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
        }
        throw new Error('Có lỗi xảy ra khi tải danh sách khóa học.');
    }
};

export const getCourseDetail = async (id: number): Promise<CourseDetail> => {
    try {
        const response = await api.get(`/courses/${id}`);
        return response.data as CourseDetail;
    } catch (error: any) {
        if (error.response?.data?.error === 'COURSE_NOT_FOUND') {
            throw new Error('Khóa học không tồn tại hoặc đã bị tạm gỡ.');
        }
        if (error.response?.data?.error === 'SERVER_ERROR') {
            throw new Error('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
        }
        throw new Error('Có lỗi xảy ra khi tải thông tin khóa học.');
    }
};

// WP1.4 — public, no-auth view of a course reached via its share link
export const getSharedCourse = async (token: string): Promise<PublicCourse> => {
    try {
        const response = await api.get(`/courses/share/${token}`);
        return response.data as PublicCourse;
    } catch (error: any) {
        if (error.response?.data?.error === 'SHARE_LINK_NOT_FOUND') {
            throw new Error('Link chia sẻ không tồn tại hoặc đã hết hiệu lực.');
        }
        throw new Error('Có lỗi xảy ra khi tải khóa học được chia sẻ.');
    }
};

// WP1.4 — "Sao chép về học": clone a shared course into the caller's account
export const copySharedCourse = async (token: string): Promise<{ courseId: string }> => {
    try {
        const response = await api.post(`/courses/share/${token}/copy`);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.error === 'UNAUTHORIZED') {
            throw new Error('Vui lòng đăng nhập để sao chép khóa học.');
        }
        if (error.response?.data?.error === 'SHARE_LINK_NOT_FOUND') {
            throw new Error('Link chia sẻ không tồn tại hoặc đã hết hiệu lực.');
        }
        throw new Error('Có lỗi xảy ra khi sao chép khóa học.');
    }
};
