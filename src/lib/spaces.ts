import api from './api';
import { Space, SpaceDetail, PublicSpace, Companion } from '@/types/space.types';

export const getSpaces = async (search?: string): Promise<Space[]> => {
    try {
        const params = search ? { search } : {};
        const response = await api.get('/spaces', { params });
        return response.data as Space[];
    } catch (error: any) {
        if (error.response?.data?.error === 'SERVER_ERROR') {
            throw new Error('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
        }
        throw new Error('Có lỗi xảy ra khi tải danh sách Space.');
    }
};

export const getSpaceDetail = async (id: number): Promise<SpaceDetail> => {
    try {
        const response = await api.get(`/spaces/${id}`);
        return response.data as SpaceDetail;
    } catch (error: any) {
        if (error.response?.data?.error === 'SPACE_NOT_FOUND') {
            throw new Error('Space không tồn tại hoặc đã bị tạm gỡ.');
        }
        if (error.response?.data?.error === 'SERVER_ERROR') {
            throw new Error('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
        }
        throw new Error('Có lỗi xảy ra khi tải thông tin Space.');
    }
};

// WP1.7 — who else is learning this space's clone lineage (owner-authored
// root + everyone who cloned it). Empty when the caller is the only one, or
// silently empty on any error — this is a nice-to-have social layer, not
// something that should ever block the space-detail page from rendering.
export const getCompanions = async (spaceId: number): Promise<Companion[]> => {
    try {
        const response = await api.get(`/spaces/${spaceId}/companions`);
        return response.data.companions as Companion[];
    } catch {
        return [];
    }
};

// WP1.4 — public, no-auth view of a space reached via its share link
export const getSharedSpace = async (token: string): Promise<PublicSpace> => {
    try {
        const response = await api.get(`/spaces/share/${token}`);
        return response.data as PublicSpace;
    } catch (error: any) {
        if (error.response?.data?.error === 'SHARE_LINK_NOT_FOUND') {
            throw new Error('Link chia sẻ không tồn tại hoặc đã hết hiệu lực.');
        }
        throw new Error('Có lỗi xảy ra khi tải Space được chia sẻ.');
    }
};

// WP1.4 — "Sao chép về học": clone a shared space into the caller's account
export const copySharedSpace = async (token: string): Promise<{ spaceId: string }> => {
    try {
        const response = await api.post(`/spaces/share/${token}/copy`);
        return response.data;
    } catch (error: any) {
        if (error.response?.data?.error === 'UNAUTHORIZED') {
            throw new Error('Vui lòng đăng nhập để sao chép Space.');
        }
        if (error.response?.data?.error === 'SHARE_LINK_NOT_FOUND') {
            throw new Error('Link chia sẻ không tồn tại hoặc đã hết hiệu lực.');
        }
        throw new Error('Có lỗi xảy ra khi sao chép Space.');
    }
};
