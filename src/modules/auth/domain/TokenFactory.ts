import { TokenEntity } from './TokenEntity';
import { UserEntity } from './UserEntity';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../shared/config/jwt';

export class TokenFactory {
    private static getJwtSecret(): string {
        return getJwtSecret();
    }

    static createActivationToken(userId: bigint): TokenEntity {
        const code = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return new TokenEntity(BigInt(0), userId, code, 'ACTIVATION', expiresAt, false);
    }

    static createRecoveryToken(userId: bigint): TokenEntity {
        const code = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return new TokenEntity(BigInt(0), userId, code, 'RECOVERY', expiresAt, false);
    }

    static createAuthTokens(user: UserEntity): { accessToken: string; refreshToken: string } {
        try {
            const secret = this.getJwtSecret();
            const accessToken = jwt.sign(
                { id: user.id.toString(), role: user.role, type: 'access' },
                secret,
                { expiresIn: '15m' } // Short-lived access token
            );
            const refreshToken = jwt.sign(
                { id: user.id.toString(), role: user.role, type: 'refresh' },
                secret,
                { expiresIn: '7d' } // Long-lived refresh token
            );
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('JWT creation error:', error);
            throw error;
        }
    }

    static verifyRefreshToken(token: string): { userId: bigint; issuedAt: Date } | null {
        try {
            const secret = this.getJwtSecret();
            const decoded = jwt.verify(token, secret) as any;
            if (decoded.type === 'refresh') {
                // `iat` là số giây kể từ epoch do jsonwebtoken tự gắn khi sign() —
                // dùng để so sánh với password_changed_at (xem /auth/refresh).
                return { userId: BigInt(decoded.id), issuedAt: new Date(decoded.iat * 1000) };
            }
            return null;
        } catch {
            return null;
        }
    }
}
