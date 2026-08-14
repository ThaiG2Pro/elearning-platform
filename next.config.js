/** @type {import('next').NextConfig} */
const nextConfig = {
    // Emit a standalone folder with only the files needed to run the app.
    // Required for the multi-stage Docker image (copies .next/standalone).
    output: 'standalone',

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
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' www.youtube.com s.ytimg.com",
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
