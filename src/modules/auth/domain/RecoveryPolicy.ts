import { TokenEntity } from './TokenEntity';

export class RecoveryPolicy {
    static validateRecoveryToken(token: TokenEntity | null): TokenEntity {
        if (!token || token.type !== 'RECOVERY' || token.isUsedToken() || token.isExpired()) {
            throw new Error('TOKEN_INVALID');
        }
        return token;
    }
}
