import { prisma } from '../../../shared/config/database';
import { TokenEntity } from '../domain/TokenEntity';
import type { token_type } from '@prisma/client';

export class TokenRepository {
    async findByCode(code: string): Promise<TokenEntity | null> {
        const token = await prisma.tokens.findUnique({
            where: { code },
        });
        if (!token) return null;
        return new TokenEntity(token.id, token.user_id, token.code, token.type, token.expires_at, token.is_used);
    }

    async save(token: TokenEntity): Promise<void> {
        await prisma.tokens.create({
            data: {
                user_id: token.userId,
                code: token.code,
                type: token.type as token_type,
                expires_at: token.expiresAt,
                is_used: token.isUsed,
            },
        });
    }

    async markAsUsed(token: TokenEntity): Promise<void> {
        await prisma.tokens.update({
            where: { id: token.id },
            data: { is_used: true },
        });
    }

    async revokeAllByType(userId: bigint, type: token_type): Promise<void> {
        await prisma.tokens.updateMany({
            where: { user_id: userId, type },
            data: { is_used: true },
        });
    }
}
