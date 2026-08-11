'use client';

import { useEffect } from 'react';

// WP1.5.11 follow-up — `error.tsx` only catches errors thrown while
// rendering *inside* the root layout's children; an error thrown by the
// root layout itself (`layout.tsx`) has nowhere left to bubble to except
// Next.js's unbranded default error page, because `error.tsx` is rendered
// as a sibling of that same layout, not a replacement for it. `global-error.tsx`
// is the one boundary Next.js gives specifically for that case — it must
// render its own <html>/<body> since the root layout is what failed.
//
// Deliberately no `Button`/Tailwind-component reuse here: this file has to
// keep working even if the failure is in shared layout/style plumbing, so
// it's plain inline styles with no dependency on anything that could itself
// be the reason the root layout broke.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled root layout error:', error);
    }, [error]);

    return (
        <html lang="vi">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '9999px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: 28, color: '#f87171' }}>⚠</span>
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ứng dụng gặp sự cố nghiêm trọng</h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', maxWidth: 380 }}>
                        Rất tiếc, có lỗi không mong muốn khiến trang không thể hiển thị. Bạn có thể thử tải lại.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => reset()}
                            style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                            Thử lại
                        </button>
                        <button
                            onClick={() => { window.location.href = '/'; }}
                            style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
