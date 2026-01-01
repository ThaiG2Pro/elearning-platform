import api from './api';
import { IdentifyRequest, IdentifyResponse, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest, ResetPasswordResponse, UpdateProfileRequest, UpdateProfileResponse, ChangePasswordRequest, ChangePasswordResponse, ActivateRequest, ActivateResponse, User } from '@/types/auth.types';

export const logout = async (): Promise<void> => {
    try {
        await api.post('/auth/logout');
    } catch (error: any) {
        // Logout usually doesn't fail, but handle if needed
        throw new Error('Có lỗi xảy ra khi đăng xuất.');
    } finally {
        // Always clear tokens from localStorage
        AuthUtils.clearTokens();
    }
};

export const identifyUser = async (request: IdentifyRequest): Promise<IdentifyResponse> => {
    try {
        const response = await api.post('/auth/identify', request);
        return response.data as IdentifyResponse;
    } catch (error: any) {
        if (error.response?.data?.error === 'INVALID_FORMAT') {
            throw new Error('Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.');
        }
        if (error.response?.data?.error === 'RATE_LIMIT_EXCEEDED') {
            throw new Error('Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
        }
        throw new Error('Có lỗi xảy ra khi xác định danh tính.');
    }
};

export const loginUser = async (request: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await api.post('/auth/login', request);
        const loginData = response.data as LoginResponse;

        // Store tokens in localStorage
        AuthUtils.setTokens(loginData.accessToken, loginData.refreshToken);
        // Store user info in localStorage
        AuthUtils.setUserInfo(loginData.user);

        return loginData;
    } catch (error: any) {
        if (error.response?.data?.code === 'AUTH_FAILED') {
            throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
        }
        if (error.response?.data?.code === 'USER_INACTIVE') {
            throw new Error('Tài khoản hiện đang bị khóa. Vui lòng liên hệ quản trị viên.');
        }
        if (error.response?.data?.code === 'RATE_LIMIT_EXCEEDED') {
            throw new Error('Quá nhiều lần thử sai. Vui lòng quay lại sau ít phút.');
        }
        if (error.response?.data?.code === 'VALIDATION_ERROR') {
            throw new Error('Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.');
        }
        throw new Error('Có lỗi xảy ra khi đăng nhập.');
    }
};

export const registerUser = async (request: RegisterRequest): Promise<RegisterResponse> => {
    try {
        const response = await api.post('/auth/register', request);
        return response.data as RegisterResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'INVALID_AGE') {
            throw new Error('INVALID_AGE');
        }
        if (error.response?.data?.code === 'PASSWORD_TOO_SHORT') {
            throw new Error('PASSWORD_TOO_SHORT');
        }
        if (error.response?.data?.code === 'USER_ALREADY_ACTIVE') {
            throw new Error('USER_ALREADY_ACTIVE');
        }
        if (error.response?.data?.code === 'VALIDATION_ERROR') {
            throw new Error('VALIDATION_ERROR');
        }
        throw new Error('Có lỗi xảy ra khi đăng ký.');
    }
};

export const forgotPassword = async (request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    try {
        const response = await api.post('/auth/forgot-password', request);
        return response.data as ForgotPasswordResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'INVALID_FORMAT') {
            throw new Error('INVALID_FORMAT');
        }
        if (error.response?.data?.code === 'RATE_LIMIT_EXCEEDED') {
            throw new Error('RATE_LIMIT_EXCEEDED');
        }
        throw new Error('Có lỗi xảy ra khi gửi yêu cầu khôi phục.');
    }
};

export const resetPassword = async (request: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    try {
        const response = await api.post('/auth/reset-password', request);
        return response.data as ResetPasswordResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'INVALID_TOKEN') {
            throw new Error('Link khôi phục không hợp lệ hoặc đã hết hạn.');
        }
        if (error.response?.data?.code === 'EXPIRED_TOKEN') {
            throw new Error('Link khôi phục đã hết hạn. Vui lòng yêu cầu link mới.');
        }
        if (error.response?.data?.code === 'PASSWORD_TOO_SHORT') {
            throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        }
        if (error.response?.data?.code === 'VALIDATION_ERROR') {
            throw new Error('Thông tin không hợp lệ. Vui lòng kiểm tra lại.');
        }
        throw new Error('Có lỗi xảy ra khi đặt lại mật khẩu.');
    }
};
export const updateProfile = async (request: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    try {
        const response = await api.put('/auth/profile', request);
        return response.data as UpdateProfileResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'VALIDATION_ERROR') {
            throw new Error('Thông tin nhập vào không hợp lệ.');
        }
        if (error.response?.data?.code === 'INVALID_AGE') {
            throw new Error('Tuổi phải là một số dương.');
        }
        throw new Error('Có lỗi xảy ra khi cập nhật hồ sơ.');
    }
};

export const getProfile = async (): Promise<{ id: bigint; email: string; fullName: string; age: number; role: string }> => {
    try {
        const response = await api.get('/auth/profile');
        return response.data;
    } catch (error: any) {
        throw new Error('Có lỗi xảy ra khi tải hồ sơ.');
    }
};

export const changePassword = async (request: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    try {
        const response = await api.put('/auth/change-password', request);
        return response.data as ChangePasswordResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'CURRENT_PASSWORD_INVALID') {
            throw new Error('Mật khẩu hiện tại không chính xác.');
        }
        if (error.response?.data?.code === 'PASSWORD_CONFIRMATION_MISMATCH') {
            throw new Error('Xác nhận mật khẩu mới không trùng khớp.');
        }
        if (error.response?.data?.code === 'PASSWORD_TOO_WEAK') {
            throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
        }
        throw new Error('Có lỗi xảy ra khi đổi mật khẩu.');
    }
};

export const activateUser = async (request: ActivateRequest): Promise<ActivateResponse> => {
    try {
        const response = await api.post('/auth/activate', request);
        return response.data as ActivateResponse;
    } catch (error: any) {
        if (error.response?.data?.code === 'TOKEN_EXPIRED') {
            throw new Error('Link kích hoạt đã hết hạn. Vui lòng đăng ký lại.');
        }
        if (error.response?.data?.code === 'USER_NOT_FOUND') {
            throw new Error('Người dùng không tồn tại. Vui lòng đăng ký lại.');
        }
        throw new Error('Có lỗi xảy ra khi kích hoạt tài khoản.');
    }
};
export class AuthUtils {
    private static readonly ACCESS_TOKEN_KEY = 'accessToken';
    private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
    private static readonly USER_INFO_KEY = 'userInfo';

    static setTokens(accessToken: string, refreshToken?: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
            if (refreshToken) {
                localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
            }
        }
    }

    static setUserInfo(user: User): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(user));
        }
    }

    static getAccessToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.ACCESS_TOKEN_KEY);
        }
        return null;
    }

    static getRefreshToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.REFRESH_TOKEN_KEY);
        }
        return null;
    }

    static clearTokens(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(this.ACCESS_TOKEN_KEY);
            localStorage.removeItem(this.REFRESH_TOKEN_KEY);
            localStorage.removeItem(this.USER_INFO_KEY);
        }
    }

    static isAuthenticated(): boolean {
        return this.getAccessToken() !== null;
    }

    static getCurrentUser(): User | null {
        if (typeof window !== 'undefined') {
            const userInfo = localStorage.getItem(this.USER_INFO_KEY);
            if (userInfo) {
                try {
                    return JSON.parse(userInfo);
                } catch {
                    return null;
                }
            }
        }
        return null;
    }
}
