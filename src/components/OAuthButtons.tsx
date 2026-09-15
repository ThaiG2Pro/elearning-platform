// 2026-09-15 — dùng chung cho /login và /register. Đây là điều hướng full
// page (<a href>) tới route backend /api/v1/auth/oauth/<provider>, KHÔNG
// phải call qua axios (`api` trong src/lib/api.ts) — route đó redirect
// trình duyệt thẳng sang trang đồng ý của Google/GitHub.
// SVG inline cho cả 2 logo — lucide-react đã deprecate icon brand (Github).
function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-4z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.6 26.7 37.5 24 37.5c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.6 40.6 16.3 45 24 45z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 36 45 30.5 45 24c0-1.4-.1-2.7-.4-3.5z" />
        </svg>
    );
}

function GithubIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.73 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
        </svg>
    );
}

export default function OAuthButtons() {
    return (
        <div className="grid grid-cols-2 gap-2">
            <a
                href="/api/v1/auth/oauth/google"
                className="vd-focusable flex items-center justify-center gap-2 py-2.5 px-3 border border-ink-border rounded-lg text-sm font-medium text-ink-text hover:bg-ink-page transition-colors"
            >
                <GoogleIcon />
                Google
            </a>
            <a
                href="/api/v1/auth/oauth/github"
                className="vd-focusable flex items-center justify-center gap-2 py-2.5 px-3 border border-ink-border rounded-lg text-sm font-medium text-ink-text hover:bg-ink-page transition-colors"
            >
                <GithubIcon />
                GitHub
            </a>
        </div>
    );
}
