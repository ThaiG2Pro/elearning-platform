/**
 * 2026-09-15 — đổi authorization code lấy profile thật từ Google/GitHub.
 * Tự viết bằng `fetch` (Next 15/Node 22 có sẵn global fetch) thay vì kéo
 * thêm SDK OAuth — codebase này không có next-auth/passport, và đây chỉ là
 * 2 lệnh HTTP mỗi provider.
 *
 * Security — CHỈ chấp nhận email đã được provider xác thực (verified).
 * loginWithOAuth() coi email này là đủ tin cậy để tự động liên kết vào 1
 * tài khoản password ACTIVE có sẵn (OAuthLinkPolicy 'LINK_TO_EMAIL') — nếu
 * accept luôn 1 email chưa verify, kẻ tấn công có thể tự khai 1 email không
 * thuộc về mình trên GitHub rồi chiếm quyền đăng nhập tài khoản nạn nhân.
 */

export interface OAuthProfile {
    subject: string;
    email: string;
    fullName: string;
}

interface ProviderConfig {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
}

async function exchangeCodeForToken(config: ProviderConfig, code: string, redirectUri: string, extraHeaders: Record<string, string> = {}): Promise<string> {
    const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...extraHeaders },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!response.ok) throw new Error('OAUTH_TOKEN_EXCHANGE_FAILED');
    const data = await response.json();
    if (!data.access_token) throw new Error('OAUTH_TOKEN_EXCHANGE_FAILED');
    return data.access_token as string;
}

export async function fetchGoogleProfile(config: ProviderConfig, code: string, redirectUri: string): Promise<OAuthProfile> {
    const accessToken = await exchangeCodeForToken(config, code, redirectUri);

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('OAUTH_PROFILE_FETCH_FAILED');
    const profile = await response.json();

    // Google trả email_verified dạng boolean (đôi khi string "true" tuỳ endpoint).
    if (!profile.sub || !profile.email || !(profile.email_verified === true || profile.email_verified === 'true')) {
        throw new Error('OAUTH_EMAIL_UNVERIFIED');
    }
    return { subject: String(profile.sub), email: String(profile.email), fullName: profile.name || profile.email };
}

export async function fetchGithubProfile(config: ProviderConfig, code: string, redirectUri: string): Promise<OAuthProfile> {
    const accessToken = await exchangeCodeForToken(config, code, redirectUri);

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        // GitHub API từ chối request thiếu User-Agent.
        'User-Agent': 'elearning-platform-oauth',
    };

    const userResponse = await fetch('https://api.github.com/user', { headers });
    if (!userResponse.ok) throw new Error('OAUTH_PROFILE_FETCH_FAILED');
    const user = await userResponse.json();
    if (!user.id) throw new Error('OAUTH_PROFILE_FETCH_FAILED');

    // GitHub chỉ trả `email` ở /user nếu user để public; nếu null phải tra
    // riêng /user/emails và chỉ lấy địa chỉ primary + verified.
    let email: string | null = user.email && user.email_verified !== false ? user.email : null;
    if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
        if (emailsResponse.ok) {
            const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await emailsResponse.json();
            const primary = emails.find((e) => e.primary && e.verified);
            email = primary?.email || null;
        }
    }
    if (!email) throw new Error('OAUTH_EMAIL_UNVERIFIED');

    return { subject: String(user.id), email, fullName: user.name || user.login || email };
}
