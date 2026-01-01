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
    ) { }

    isActive(): boolean {
        return this.status === 'ACTIVE';
    }

    activate(): void {
        this.status = 'ACTIVE';
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
