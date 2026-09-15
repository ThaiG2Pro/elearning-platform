import { NextRequest, NextResponse } from 'next/server';
import { getOAuthProviderConfig, getOAuthRedirectUri } from '../../../../../../shared/config/oauth';
import { createOAuthState, OAUTH_STATE_COOKIE, OAUTH_STATE_MAX_AGE_SEC } from '../../../../../../shared/security/oauthState';
import { applyRateLimit, getClientIp, AUTH_RATE_LIMITS } from '../../../../../../shared/middleware/rateLimit';

// 2026-09-15 — bước 1 của flow OAuth: redirect trình duyệt sang trang đồng ý
// của Google. Đây là điều hướng GET thuần (nút <a> ở /login, không phải
// axios call), nên lỗi cũng phải trả về bằng redirect, không phải JSON.
export async function GET(request: NextRequest) {
    const limited = applyRateLimit([
        { bucket: 'oauth:ip', key: getClientIp(request), ...AUTH_RATE_LIMITS.oauthPerIp },
    ]);
    if (limited) return limited;

    try {
        const config = getOAuthProviderConfig('GOOGLE');
        const redirectUri = getOAuthRedirectUri('GOOGLE');
        const state = createOAuthState();

        const authorizeUrl = new URL(config.authorizeUrl);
        authorizeUrl.searchParams.set('client_id', config.clientId);
        authorizeUrl.searchParams.set('redirect_uri', redirectUri);
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('scope', config.scope);
        authorizeUrl.searchParams.set('state', state);

        const response = NextResponse.redirect(authorizeUrl.toString());
        response.cookies.set(OAUTH_STATE_COOKIE, state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            // 'lax' (không 'strict'): cookie này phải sống sót qua cú redirect
            // top-level từ accounts.google.com quay về callback của ta.
            sameSite: 'lax',
            maxAge: OAUTH_STATE_MAX_AGE_SEC,
            path: '/',
        });
        return response;
    } catch (error: any) {
        if (error.message === 'OAUTH_NOT_CONFIGURED') {
            return NextResponse.redirect(new URL('/login?error=oauth_not_configured', request.url));
        }
        console.error('OAuth (Google) start error:', error);
        return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }
}
