// Fix lỗi BigInt không thể chuyển sang JSON
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any)?.toJSON) {
    (BigInt.prototype as any).toJSON = function () {
        return this.toString();
    };
}

import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

// "Mực xanh trên giấy trắng" — MỘT giọng chữ duy nhất cho toàn app, đồng bộ
// với src/lib/vibe/theme.ts (Be Vietnam Pro: grotesque thiết kế riêng cho
// tiếng Việt, dấu đặt chuẩn ở mọi weight). Khai báo riêng ở đây (không import
// từ theme.ts, module đó là 'use client') để next/font tối ưu đúng cho layout
// gốc. Biến CSS đổi tên từ --font-inter → --font-sans (khớp cập nhật tương
// ứng ở tailwind.config.js fontFamily.sans) để không để lại tên gọi sai sau
// khi đổi font.
const beVietnamPro = Be_Vietnam_Pro({
    subsets: ['vietnamese', 'latin'],
    weight: ['300', '400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-sans',
})

export const metadata: Metadata = {
    title: 'E-Learning Platform',
    description: 'Nền tảng học trực tuyến chuyên nghiệp',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="vi" className={beVietnamPro.variable}>
            <body className="font-sans antialiased bg-ink-page text-ink-text">{children}</body>
        </html>
    )
}
