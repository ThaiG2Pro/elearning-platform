import type { MetadataRoute } from 'next';

// B2 (docs/SURVIVAL.md): crawler AI (GPTBot, ClaudeBot, Bytespider, Amazonbot…) cào hàng
// nghìn trang/giờ, mỗi trang học là 1 lần render + query — với 1 vCPU chúng là "user" đông
// nhất. Bot xấu không đọc robots.txt nên còn chặn thêm ở Caddy (deploy/Caddyfile, @badbots).
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // Bot AI/cào dữ liệu: chặn hẳn — không mang user, chỉ tốn CPU.
            {
                userAgent: [
                    'GPTBot',
                    'ClaudeBot',
                    'CCBot',
                    'Bytespider',
                    'Amazonbot',
                    'PetalBot',
                    'anthropic-ai',
                    'Google-Extended',
                    'Applebot-Extended',
                    'meta-externalagent',
                ],
                disallow: '/',
            },
            // Bot tìm kiếm: cho trang public, cấm API và trang cần đăng nhập.
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/my-learning', '/my-spaces', '/profile', '/billing'],
            },
        ],
        // TODO: chưa có src/app/sitemap.ts — thêm khi cần SEO sâu hơn, robots.txt vẫn
        // hợp lệ mà không có dòng Sitemap.
    };
}
