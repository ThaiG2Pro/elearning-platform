import * as bcrypt from 'bcryptjs';;

export class UserEntity {
    constructor(
        public id: bigint,
        public email: string,
        public passwordHash: string,
        public status: string,
        public role: string,
        public fullName: string,
        public age?: number,
        public createdAt?: Date,
        public lastLoginAt?: Date,
        public avatarUrl?: string,
        // Security — mốc đổi mật khẩu gần nhất, dùng để vô hiệu hoá refresh
        // token cũ (xem changePassword()).
        public passwordChangedAt?: Date,
        // 2026-09-15 — danh tính OAuth (Google/GitHub), cả hai cùng có hoặc
        // cùng không — user đăng ký bằng password không set 2 field này.
        public oauthProvider?: 'GOOGLE' | 'GITHUB',
        public oauthSubject?: string,
    ) { }

    isActive(): boolean {
        return this.status === 'ACTIVE';
    }

    activate(): void {
        this.status = 'ACTIVE';
    }

    // WP1.5.6: soft delete only — hard-deleting the row would violate the
    // RESTRICT foreign keys on spaces.owner_id for basically any real
    // account. Reusing 'INACTIVE' would collide
    // with the pending-activation meaning that status already has (see
    // RegistrationPolicy / deleteInactiveUsersOlderThan24Hours), so this is
    // a distinct status value. isActive() already returns false for it,
    // which blocks login the same way an inactive account is blocked.
    markDeleted(): void {
        this.status = 'DELETED';
    }

    updateAvatar(avatarUrl: string): void {
        this.avatarUrl = avatarUrl;
    }

    async matchPassword(password: string): Promise<boolean> {
        return await bcrypt.compare(password, this.passwordHash);
    }

    async changePassword(newPassword: string): Promise<void> {
        this.passwordHash = await bcrypt.hash(newPassword, 10);
        // Security — bất kỳ refresh token nào phát hành trước thời điểm này
        // (kể cả token bị lộ) sẽ bị /auth/refresh từ chối. Áp dụng cho cả
        // đổi mật khẩu (change-password) lẫn khôi phục (reset-password) vì
        // cả hai đều đi qua hàm này.
        this.passwordChangedAt = new Date();
    }

    updateLastLogin(): void {
        this.lastLoginAt = new Date();
    }

    updateProfile(fullName: string, age?: number): void {
        this.fullName = fullName;
        this.age = age;
    }

    // 2026-09-15 — auto-link (quyết định sản phẩm): 1 email OAuth trùng tài
    // khoản password ACTIVE có sẵn thì gắn danh tính OAuth vào đúng user đó
    // thay vì tạo bản ghi trùng — xem OAuthLinkPolicy/AuthService.loginWithOAuth.
    linkOAuth(provider: 'GOOGLE' | 'GITHUB', subject: string): void {
        this.oauthProvider = provider;
        this.oauthSubject = subject;
    }
}
