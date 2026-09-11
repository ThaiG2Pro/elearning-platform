/** @type {import('next').NextConfig} */
const nextConfig = {
    // Emit a standalone folder with only the files needed to run the app.
    // Required for the multi-stage Docker image (copies .next/standalone).
    output: 'standalone',

    // Security — tắt header "X-Powered-By: Next.js" mà Next.js tự thêm mặc
    // định trên mọi response. Không phải lỗ hổng tự thân, nhưng lộ rõ
    // framework/stack cho attacker recon (biết chính xác nên tìm CVE nào),
    // không phục vụ mục đích gì cho client hợp lệ.
    poweredByHeader: false,

    // ── Security headers ────────────────────────────────────────────────────
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options',           value: 'DENY' },
                    { key: 'X-Content-Type-Options',    value: 'nosniff' },
                    { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
                    // D6 (docs/SURVIVAL.md) — securityheaders.com/observatory hay báo thiếu
                    // header này. Cô lập BrowsingContext của tab (chặn `window.opener` từ
                    // site khác thao túng tab này) — an toàn thêm vì app không có luồng OAuth
                    // popup nào (grep window.open/popup không thấy) cần giữ `window.opener`.
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // NOTE: www.youtube.com/s.ytimg.com are deliberately scheme-less here (not
                            // "https://…"). react-youtube's underlying `youtube-player` lib builds its
                            // IFrame-API loader URL from window.location.protocol — on plain-HTTP hosts
                            // (e.g. local dev without TLS) that's `http://www.youtube.com/iframe_api`,
                            // which an explicit "https://" source never matches (CSP scheme-matching is
                            // exact). A scheme-less host source matches whatever scheme the page itself
                            // is loaded over, so this is correct for both http dev and https prod without
                            // having to list both schemes.
                            //
                            // Security (2026-09-08): 'unsafe-eval' dropped in production — grep across
                            // src/ found no eval()/new Function() call anywhere in app code, so nothing
                            // legitimate needs it there and it only helps an XSS payload run arbitrary
                            // strings as code. Kept in development only: `next dev`'s webpack HMR client
                            // uses eval-based source maps by default, which this same CSP would otherwise
                            // block, breaking local dev/hot-reload. 'unsafe-inline' stays in both — Next.js
                            // App Router injects its own inline <script> for RSC/hydration data with no
                            // nonce wired up (would need a new middleware.ts issuing a per-request nonce);
                            // removing it blind, without a browser to verify hydration still works, risks
                            // shipping a broken page. Tracked as a follow-up, not done here.
                            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} www.youtube.com s.ytimg.com`,
                            "style-src 'self' 'unsafe-inline'",
                            // vumbnail.com serves Vimeo thumbnails (VideoThumbnailUtil); i.vimeocdn.com backs
                            // vumbnail's redirects/CDN images.
                            "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://vumbnail.com https://i.vimeocdn.com",
                            // player.vimeo.com: VimeoPlayer's iframe. Without it, every Vimeo lesson's
                            // iframe is silently refused by the browser (frame-src violation).
                            "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
                            // The YouTube IFrame API script (react-youtube) runs in the TOP page's JS
                            // context, not inside its iframe — its own internal XHR/fetch calls to
                            // www.youtube.com are therefore subject to *this* page's connect-src, not
                            // youtube.com's. Same scheme-less reasoning as script-src above.
                            "connect-src 'self' www.youtube.com s.ytimg.com",
                            "font-src 'self'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },

    // ── Image optimization ──────────────────────────────────────────────────
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'img.youtube.com' },
            { protocol: 'https', hostname: 'i.ytimg.com' },
        ],
    },

    // ── Telemetry ────────────────────────────────────────────────────────────
    // Disable Next.js anonymous usage collection.
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    },
};

module.exports = nextConfig;
