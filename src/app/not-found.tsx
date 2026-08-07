'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

// WP1.5.11: there was no not-found.tsx anywhere in `src/app` — a bad course
// id, a revoked share link, or any other 404 fell through to Next.js's
// unbranded default page.
export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy trang</h1>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
                Trang bạn tìm không tồn tại, đã bị xoá, hoặc link chia sẻ đã bị thu hồi.
            </p>
            <Button asChild>
                <Link href="/">Về trang chủ</Link>
            </Button>
        </div>
    );
}
