import api from './api';
import { Course, CourseDetail, EnrollResponse } from '@/types/course.types';

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

export const enrollCourse = async (id: number): Promise<EnrollResponse> => {
    try {
        const response = await api.post(`/courses/${id}/enroll`);
        return response.data as EnrollResponse;
    } catch (error: any) {
        if (error.response?.data?.error === 'ALREADY_ENROLLED') {
            throw new Error('Bạn đã tham gia khóa học này.');
        }
        if (error.response?.data?.error === 'COURSE_NOT_ACTIVE') {
            throw new Error('Khóa học hiện chưa cho phép đăng ký.');
        }
        if (error.response?.data?.error === 'ROLE_DENIED') {
            throw new Error('Chỉ học viên mới có thể đăng ký khóa học.');
        }
        if (error.response?.data?.error === 'UNAUTHORIZED') {
            throw new Error('Vui lòng đăng nhập để đăng ký khóa học.');
        }
        if (error.response?.data?.error === 'COURSE_NOT_FOUND') {
            throw new Error('Khóa học không tồn tại.');
        }
        throw new Error('Có lỗi xảy ra khi đăng ký khóa học.');
    }
};
