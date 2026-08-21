import { prisma } from '../../../shared/config/database';
import { UserEntity } from '../domain/UserEntity';
import type { user_role, user_status } from '@prisma/client';

// Avatar sống ở bảng user_avatars (1-1) — bảng users không cõng blob data-URL
// nữa; các query auth/join khác vào users vì thế nhẹ đi. Hai finder dưới đây
// include avatar vì UserEntity vẫn expose avatarUrl cho profile/login.
type UserWithAvatar = {
    id: bigint; email: string; password_hash: string; status: user_status;
    role: user_role; full_name: string; age: number | null;
    created_at: Date | null; avatar: { data: string } | null;
};

function toEntity(user: UserWithAvatar): UserEntity {
    return new UserEntity(
        user.id,
        user.email,
        user.password_hash,
        user.status,
        user.role,
        user.full_name,
        user.age || undefined,
        user.created_at || undefined,
        undefined, // lastLoginAt - not loaded in this query
        user.avatar?.data || undefined,
    );
}

export class UserRepository {
    async findByEmail(email: string): Promise<UserEntity | null> {
        const user = await prisma.users.findUnique({
            where: { email },
            include: { avatar: { select: { data: true } } },
        });
        if (!user) return null;
        return toEntity(user);
    }

    async findById(id: bigint): Promise<UserEntity | null> {
        const user = await prisma.users.findUnique({
            where: { id },
            include: { avatar: { select: { data: true } } },
        });
        if (!user) return null;
        return toEntity(user);
    }

    async createUser(data: {
        email: string;
        password_hash: string;
        full_name: string;
        status: user_status;
        role: user_role;
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
        status: user_status;
        age: number;
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
                    status: user.status as user_status,
                    role: user.role as user_role,
                    age: user.age || null,
                    created_at: new Date(),
                },
            });
            user.id = created.id; // Update the entity with the new ID
        } else {
            // Existing user — avatar upsert/delete giữ nguyên ngữ nghĩa cũ
            // (save() luôn đồng bộ avatarUrl của entity xuống DB).
            await prisma.$transaction([
                prisma.users.update({
                    where: { id: user.id },
                    data: {
                        password_hash: user.passwordHash,
                        full_name: user.fullName,
                        status: user.status as user_status,
                        age: user.age || null,
                    },
                }),
                user.avatarUrl
                    ? prisma.user_avatars.upsert({
                        where: { user_id: user.id },
                        update: { data: user.avatarUrl },
                        create: { user_id: user.id, data: user.avatarUrl },
                    })
                    : prisma.user_avatars.deleteMany({ where: { user_id: user.id } }),
            ]);
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

    // WP1.5.6 — clear any pending activation/reset codes for an account
    // that just got soft-deleted. Note: this table holds one-time codes
    // (activation/reset), not JWT sessions — the access token stays valid
    // until it naturally expires since shared/middleware/auth.ts trusts the
    // JWT payload without a DB lookup; the refresh route does re-check
    // isActive(), so refreshing is blocked immediately.
    async invalidateAllTokens(userId: bigint): Promise<void> {
        await prisma.tokens.deleteMany({ where: { user_id: userId } });
    }

}
