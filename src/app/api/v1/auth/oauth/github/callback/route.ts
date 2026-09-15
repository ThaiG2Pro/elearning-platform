import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../../../modules/auth/controllers/AuthController';
import { fetchGithubProfile } from '../../../../../../../modules/auth/oauth/providerProfiles';
import { getOAuthProviderConfig, getOAuthRedirectUri } from '../../../../../../../shared/config/oauth';
import { OAUTH_STATE_COOKIE } from '../../../../../../../shared/security/oauthState';
import { applyRateLimit, getClientIp, AUTH_RATE_LIMITS } from '../../../../../../../shared/middleware/rateLimit';

const authController = new AuthController();

function failRedirect(request: NextRequest, reason: string): NextResponse {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
}

// 2026-09-15 — bước 2 của flow GitHub, song song với oauth/google/callback/route.ts.
export async function GET(request: NextRequest) {
    const limited = applyRateLimit([
        { bucket: 'oauth:ip', key: getClientIp(request), ...AUTH_RATE_LIMITS.oauthPerIp },
    ]);
    if (limited) return limited;

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

    if (!code || !state || !cookieState || state !== cookieState) {
        return failRedirect(request, 'oauth_failed');
    }

    try {
        const config = getOAuthProviderConfig('GITHUB');
        const redirectUri = getOAuthRedirectUri('GITHUB');
        const profile = await fetchGithubProfile(config, code, redirectUri);

        const result = await authController.loginWithOAuth({
            provider: 'GITHUB',
            subject: profile.subject,
            email: profile.email,
            fullName: profile.fullName,
        });

        const response = NextResponse.redirect(new URL('/login/oauth-callback', request.url));
        response.cookies.set('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
        });
        response.cookies.set('oauthHandoff', JSON.stringify({ accessToken: result.accessToken, user: result.user, redirectUrl: result.redirectUrl }), {
            httpOnly: false,
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
        console.error('OAuth (GitHub) callback error:', error);
        return failRedirect(request, 'oauth_failed');
    }
}
