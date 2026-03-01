import api from './api';
import { ApprovalQueueItem, ModerateRequest } from '@/types/admin.types';

export const getApprovalQueue = async (): Promise<ApprovalQueueItem[]> => {
    try {
        const response = await api.get('/management/approval-queue');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Không thể tải danh sách chờ duyệt');
    }
};

export const moderateCourse = async (courseId: number, data: ModerateRequest): Promise<void> => {
    try {
        await api.post(`/management/courses/${courseId}/moderate`, data);
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Không thể thực hiện duyệt khóa học');
    }
};
