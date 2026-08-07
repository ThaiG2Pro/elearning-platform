'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// WP1.5.11: there was no error.tsx anywhere in `src/app` — any uncaught
// runtime error during render fell through to Next.js's unbranded default
// error page with no way back into the app short of typing a URL.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled page error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Đã có lỗi xảy ra</h1>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
                Rất tiếc, có lỗi không mong muốn xảy ra. Bạn có thể thử lại hoặc quay về trang chủ.
            </p>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => reset()}>Thử lại</Button>
                <Button onClick={() => { window.location.href = '/'; }}>Về trang chủ</Button>
            </div>
        </div>
    );
}
