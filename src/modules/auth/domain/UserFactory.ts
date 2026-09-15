import { UserEntity } from './UserEntity';
import * as bcrypt from 'bcryptjs';;
import * as crypto from 'crypto';

export class UserFactory {
    static async createInactiveUser(email: string, password: string, fullName: string, age?: number): Promise<UserEntity> {
        // BR-ID-04: Password Strength
        if (password.length < 6) {
            throw new Error('PASSWORD_TOO_SHORT');
        }
        // BR-ID-05: Age Constraint
        if (age !== undefined && (age <= 0 || !Number.isInteger(age))) {
            throw new Error('INVALID_AGE');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        return new UserEntity(
            BigInt(0), // ID will be set by DB
            email,
            hashedPassword,
            'INACTIVE',
            'STUDENT',
            fullName,
            age,
            undefined, // createdAt - will be set by DB
            undefined, // lastLoginAt
        );
    }

    static async reconstituteForOverwrite(existingUser: UserEntity, password: string, fullName: string, age?: number): Promise<UserEntity> {
        // BR-ID-04: Password Strength
        if (password.length < 6) {
            throw new Error('PASSWORD_TOO_SHORT');
        }
        // BR-ID-05: Age Constraint
        if (age !== undefined && (age <= 0 || !Number.isInteger(age))) {
            throw new Error('INVALID_AGE');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        return new UserEntity(
            existingUser.id,
            existingUser.email,
            hashedPassword,
            'INACTIVE', // Reset to inactive
            existingUser.role,
            fullName,
            age !== undefined ? age : existingUser.age,
            existingUser.createdAt, // Keep existing createdAt
            undefined, // lastLoginAt
        );
    }

    // 2026-09-15 — tạo user từ đăng nhập Google/GitHub. users.password_hash
    // vẫn NOT NULL ở DB nên sinh 1 password ngẫu nhiên không ai biết (và
    // không trả về cho ai) thay vì đổi cột sang nullable — xem ghi chú ở
    // migration 20260915030000_add_oauth_identity. status ACTIVE ngay vì
    // provider đã verify email hộ, không cần activation email.
    static async createFromOAuth(email: string, fullName: string, provider: 'GOOGLE' | 'GITHUB', subject: string): Promise<UserEntity> {
        const unusablePassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(unusablePassword, 10);
        const user = new UserEntity(
            BigInt(0), // ID will be set by DB
            email,
            hashedPassword,
            'ACTIVE',
            'STUDENT',
            fullName,
            undefined, // age - not provided by OAuth providers
            undefined, // createdAt - will be set by DB
            undefined, // lastLoginAt
        );
        user.linkOAuth(provider, subject);
        return user;
    }
}
