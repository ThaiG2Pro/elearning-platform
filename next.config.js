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
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com",
                            "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
                            "connect-src 'self'",
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
