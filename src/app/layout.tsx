// Fix lỗi BigInt không thể chuyển sang JSON
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any)?.toJSON) {
    (BigInt.prototype as any).toJSON = function () {
        return this.toString();
    };
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
        <html lang="vi" className={inter.variable}>
            <body className="font-sans antialiased bg-slate-50 text-slate-900">{children}</body>
        </html>
    )
}
