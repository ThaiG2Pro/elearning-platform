import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../../../modules/auth/controllers/AuthController';
import { fetchGoogleProfile } from '../../../../../../../modules/auth/oauth/providerProfiles';
import { getOAuthProviderConfig, getOAuthRedirectUri } from '../../../../../../../shared/config/oauth';
import { OAUTH_STATE_COOKIE } from '../../../../../../../shared/security/oauthState';
import { applyRateLimit, getClientIp, AUTH_RATE_LIMITS } from '../../../../../../../shared/middleware/rateLimit';

const authController = new AuthController();

function failRedirect(request: NextRequest, reason: string): NextResponse {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
}

// 2026-09-15 — bước 2: Google redirect người dùng về đây kèm ?code&state.
// GET thuần (điều hướng trình duyệt), nên MỌI lỗi cũng trả 302 về /login,
// không phải JSON — không có ai ở phía client đọc response body ở đây.
export async function GET(request: NextRequest) {
    const limited = applyRateLimit([
        { bucket: 'oauth:ip', key: getClientIp(request), ...AUTH_RATE_LIMITS.oauthPerIp },
    ]);
    if (limited) return limited;

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

    // Chống login-CSRF (xem shared/security/oauthState.ts) — state phải
    // khớp cookie đã set ở bước 1, và cả hai phải tồn tại.
    if (!code || !state || !cookieState || state !== cookieState) {
        return failRedirect(request, 'oauth_failed');
    }

    try {
        const config = getOAuthProviderConfig('GOOGLE');
        const redirectUri = getOAuthRedirectUri('GOOGLE');
        const profile = await fetchGoogleProfile(config, code, redirectUri);

        const result = await authController.loginWithOAuth({
            provider: 'GOOGLE',
            subject: profile.subject,
            email: profile.email,
            fullName: profile.fullName,
        });

        // Cùng cơ chế cookie refreshToken với /auth/login (route.ts) — chỉ
        // khác: đây là redirect GET, JSON body không tới được localStorage,
        // nên accessToken/user đi tiếp qua 1 cookie tạm cho trang handoff đọc.
        const response = NextResponse.redirect(new URL('/login/oauth-callback', request.url));
        response.cookies.set('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
        });
        response.cookies.set('oauthHandoff', JSON.stringify({ accessToken: result.accessToken, user: result.user, redirectUrl: result.redirectUrl }), {
            httpOnly: false, // trang /login/oauth-callback (client component) cần đọc được
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60,
            path: '/',
        });
        response.cookies.delete(OAUTH_STATE_COOKIE);
        return response;
    } catch (error: any) {
        if (error.message === 'OAUTH_EMAIL_UNVERIFIED') {
            return failRedirect(request, 'oauth_email_unverified');
        }
        if (error.message === 'OAUTH_NOT_CONFIGURED' || error.message === 'OAUTH_TOKEN_EXCHANGE_FAILED' || error.message === 'OAUTH_PROFILE_FETCH_FAILED') {
            return failRedirect(request, 'oauth_failed');
        }
        console.error('OAuth (Google) callback error:', error);
        return failRedirect(request, 'oauth_failed');
    }
}
