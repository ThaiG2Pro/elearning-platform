import * as bcrypt from 'bcryptjs';;

export class UserEntity {
    constructor(
        public id: bigint,
        public email: string,
        public passwordHash: string,
        public status: string,
        public roleId: number,
        public roleName: string,
        public fullName: string,
        public age?: number,
        public createdAt?: Date,
        public lastLoginAt?: Date,
        public avatarUrl?: string,
    ) { }

    isActive(): boolean {
        return this.status === 'ACTIVE';
    }

    activate(): void {
        this.status = 'ACTIVE';
    }

    // WP1.5.6: soft delete only — hard-deleting the row would violate the
    // RESTRICT foreign keys on courses.owner_id/lecturer_id, enrollments and
    // notes for basically any real account. Reusing 'INACTIVE' would collide
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
    }

    updateLastLogin(): void {
        this.lastLoginAt = new Date();
    }

    updateProfile(fullName: string, age?: number): void {
        this.fullName = fullName;
        this.age = age;
    }
}
