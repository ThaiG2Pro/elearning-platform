import { prisma } from '../../../shared/config/database';
import { UserEntity } from '../domain/UserEntity';

export class UserRepository {
    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await prisma.users.findUnique({
            where: { email },
            include: { role: true },
        });
        if (!user) return null;
        return new UserEntity(
            user.id,
            user.email,
            user.password_hash,
            user.status,
            user.role_id,
            user.role.name,
            user.full_name,
            user.age || undefined,
            user.created_at || undefined,
            undefined, // lastLoginAt - not loaded in this query
        );
    }

    async findById(id: bigint): Promise<UserEntity | null> {
        const user = await prisma.users.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) return null;
        return new UserEntity(
            user.id,
            user.email,
            user.password_hash,
            user.status,
            user.role_id,
            user.role.name,
            user.full_name,
            user.age || undefined,
            user.created_at || undefined,
            undefined, // lastLoginAt - not loaded in this query
        );
    }

    async createUser(data: {
        email: string;
        password_hash: string;
        full_name: string;
        status: string;
        role_id: number;
        age?: number;
        created_at: Date;
    }): Promise<bigint> {
        const user = await prisma.users.create({
            data,
        });
        return user.id;
    }

    async updateUser(id: bigint, data: Partial<{
        password_hash: string;
        full_name: string;
        status: string;
        age: number;
        avatar_url: string;
        created_at: Date;
    }>): Promise<void> {
        await prisma.users.update({
            where: { id },
            data,
        });
    }

    async save(user: UserEntity): Promise<void> {
        if (user.id === BigInt(0)) {
            // New user
            const created = await prisma.users.create({
                data: {
                    email: user.email,
                    password_hash: user.passwordHash,
                    full_name: user.fullName,
                    status: user.status,
                    role_id: user.roleId,
                    age: user.age || null,
                    created_at: new Date(),
                },
            });
            user.id = created.id; // Update the entity with the new ID
        } else {
            // Existing user
            await prisma.users.update({
                where: { id: user.id },
                data: {
                    password_hash: user.passwordHash,
                    full_name: user.fullName,
                    status: user.status,
                    age: user.age || null,
                },
            });
        }
    }

    async deleteInactiveUsersOlderThan24Hours(): Promise<void> {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await prisma.users.deleteMany({
            where: {
                status: 'INACTIVE',
                created_at: {
                    lt: twentyFourHoursAgo,
                },
            },
        });
    }

}
