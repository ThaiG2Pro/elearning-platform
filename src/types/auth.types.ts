export interface User {
    id: string;
    role: string;
    fullName: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
    redirectUrl: string;
}

export interface LogoutResponse {
    message: string;
}
export interface IdentifyRequest {
    email: string;
    continueUrl?: string;
}

export interface IdentifyResponse {
    action: 'LOGIN' | 'REGISTER';
    continueUrl: string;
}
export interface LoginRequest {
    email: string;
    password: string;
    continueUrl?: string;
}

export interface RegisterRequest {
    email: string;
    fullName: string;
    age: number;
    password: string;
    continueUrl?: string;
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    message: string;
}

export interface ResetPasswordRequest {
    password: string;
    token: string;
}

export interface ResetPasswordResponse {
    message: string;
}

export interface ActivateRequest {
    token: string;
}

export interface ActivateResponse {
    message: string;
}

export interface UpdateProfileRequest {
    fullName: string;
    age: number;
}

export interface UpdateProfileResponse {
    message: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ChangePasswordResponse {
    message: string;
}
