/**
 * Cấu hình OAuth (Google/GitHub social login) — 2026-09-15.
 *
 * Fail-closed như jwt.ts, nhưng throw LÚC ĐƯỢC GỌI (trong route), không lúc
 * import: app vẫn chạy bình thường nếu chưa cấu hình OAuth và không ai bấm
 * nút "Đăng nhập với Google/GitHub".
 */

export type OAuthProviderKey = 'GOOGLE' | 'GITHUB';

interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    authorizeUrl: string;
    tokenUrl: string;
    scope: string;
}

const PROVIDER_ENV: Record<OAuthProviderKey, { idVar: string; secretVar: string; authorizeUrl: string; tokenUrl: string; scope: string }> = {
    GOOGLE: {
        idVar: 'GOOGLE_CLIENT_ID',
        secretVar: 'GOOGLE_CLIENT_SECRET',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'openid email profile',
    },
    GITHUB: {
        idVar: 'GITHUB_CLIENT_ID',
        secretVar: 'GITHUB_CLIENT_SECRET',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'read:user user:email',
    },
};

export function getOAuthProviderConfig(provider: OAuthProviderKey): OAuthProviderConfig {
    const env = PROVIDER_ENV[provider];
    const clientId = process.env[env.idVar];
    const clientSecret = process.env[env.secretVar];
    if (!clientId || !clientSecret) {
        throw new Error('OAUTH_NOT_CONFIGURED');
    }
    return { clientId, clientSecret, authorizeUrl: env.authorizeUrl, tokenUrl: env.tokenUrl, scope: env.scope };
}

/** Base dùng để dựng redirect_uri — không dấu / cuối. */
export function getOAuthRedirectBaseUrl(): string {
    const base = process.env.OAUTH_REDIRECT_BASE_URL || process.env.FRONTEND_URL;
    if (!base) {
        throw new Error('OAUTH_NOT_CONFIGURED');
    }
    return base.replace(/\/+$/, '');
}

export function getOAuthRedirectUri(provider: OAuthProviderKey): string {
    return `${getOAuthRedirectBaseUrl()}/api/v1/auth/oauth/${provider.toLowerCase()}/callback`;
}
