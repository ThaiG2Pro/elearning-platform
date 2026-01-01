import axios from 'axios';
import { ApprovalQueueItem, ModerateRequest } from '@/types/admin.types';

export const getApprovalQueue = async (): Promise<ApprovalQueueItem[]> => {
    try {
        const response = await axios.get('/api/v1/management/approval-queue');
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Không thể tải danh sách chờ duyệt');
    }
};

export const moderateCourse = async (courseId: number, data: ModerateRequest): Promise<void> => {
    try {
        await axios.post(`/api/v1/management/courses/${courseId}/moderate`, data);
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Không thể thực hiện duyệt khóa học');
    }
};
