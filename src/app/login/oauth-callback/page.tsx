'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUtils } from '@/lib/auth';
import { sanitizeRedirectPath } from '@/shared/security/safeRedirect';

// 2026-09-15 — chặng cuối của flow OAuth. Route callback backend
// (api/v1/auth/oauth/<provider>/callback) là 1 redirect GET nên không thể
// tự ghi JSON response vào localStorage như loginUser() vẫn làm — nó set
// tạm 1 cookie non-httpOnly `oauthHandoff` (60s) rồi đưa trình duyệt tới
// đây. Trang này đọc cookie đó, hoàn tất đúng những gì loginUser() làm sau
// khi login thường thành công, rồi tự xoá cookie.
function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string): void {
    document.cookie = `${name}=; Max-Age=0; path=/`;
}

export default function OAuthCallbackPage() {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = readCookie('oauthHandoff');
            if (!raw) {
                setErrorMessage('Phiên đăng nhập OAuth đã hết hạn. Vui lòng thử lại.');
                return;
            }
            const data = JSON.parse(raw) as { accessToken: string; user: any; redirectUrl?: string };
            clearCookie('oauthHandoff');

            if (!data.accessToken || !data.user) {
                setErrorMessage('Không nhận được thông tin đăng nhập. Vui lòng thử lại.');
                return;
            }

            AuthUtils.setTokens(data.accessToken);
            AuthUtils.setUserInfo(data.user);

            router.push(sanitizeRedirectPath(data.redirectUrl, '/'));
        } catch {
            setErrorMessage('Có lỗi xảy ra khi hoàn tất đăng nhập. Vui lòng thử lại.');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-ink-page flex items-center justify-center px-4">
            <div className="text-center">
                {errorMessage ? (
                    <>
                        <p className="text-sm text-destructive mb-3">{errorMessage}</p>
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="vd-focusable text-sm text-ink-accent hover:text-ink-accent/80 font-medium"
                        >
                            Quay lại trang đăng nhập
                        </button>
                    </>
                ) : (
                    <>
                        <span className="inline-block w-6 h-6 border-2 border-ink-accent border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm text-ink-textMuted">Đang hoàn tất đăng nhập...</p>
                    </>
                )}
            </div>
        </div>
    );
}
