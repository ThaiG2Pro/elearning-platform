import { UserEntity } from './UserEntity';
import * as bcrypt from 'bcryptjs';;

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
}
