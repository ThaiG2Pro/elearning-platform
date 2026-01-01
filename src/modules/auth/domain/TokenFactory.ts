import { TokenEntity } from './TokenEntity';
import { UserEntity } from './UserEntity';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

export class TokenFactory {
    private static getJwtSecret(): string {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret_key_here') {
            throw new Error('JWT_SECRET not properly configured');
        }
        return JWT_SECRET;
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
                { id: user.id.toString(), role: user.roleName, type: 'access' },
                secret,
                { expiresIn: '15m' } // Short-lived access token
            );
            const refreshToken = jwt.sign(
                { id: user.id.toString(), role: user.roleName, type: 'refresh' },
                secret,
                { expiresIn: '7d' } // Long-lived refresh token
            );
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('JWT creation error:', error);
            throw error;
        }
    }

    static verifyRefreshToken(token: string): { userId: bigint } | null {
        try {
            const secret = this.getJwtSecret();
            const decoded = jwt.verify(token, secret) as any;
            if (decoded.type === 'refresh') {
                return { userId: BigInt(decoded.userId) };
            }
            return null;
        } catch {
            return null;
        }
    }
}
