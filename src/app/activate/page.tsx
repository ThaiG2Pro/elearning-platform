'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { activateUser } from '@/lib/auth';
import { ActivateRequest } from '@/types/auth.types';

export default function ActivatePage() {
    const router = useRouter();

    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleActivate = useCallback(async (activationToken: string) => {
        setAppState('submitting');
        setErrorMessage(null);

        try {
            const request: ActivateRequest = {
                token: activationToken,
            };

            await activateUser(request);

            setAppState('success');

            // Redirect to join gateway after 3 seconds
            setTimeout(() => {
                router.push('/join');
            }, 3000);

        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi kích hoạt tài khoản.');
        }
    }, [router]);

    useEffect(() => {
        // Get token from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token') || '';

        if (tokenParam) {
            handleActivate(tokenParam);
        } else {
            setAppState('error');
            setErrorMessage('Link kích hoạt không hợp lệ. Thiếu mã token.');
        }
    }, [handleActivate]);

    return (
        <div className="min-h-screen bg-ink-page">
            {/* Minimal header for activation page — h-14 (56px) khớp APP_TOP_BAR_H,
                cùng chiều cao Header/TopNav đã chuẩn hoá ở các trang khác. */}
            <header className="bg-ink-panel border-b border-ink-border shadow-ink-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center h-14">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-ink-accent flex items-center justify-center">
                                <span className="text-white font-bold text-sm">E</span>
                            </div>
                            <span className="font-semibold text-ink-text">E-Learning</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-16 text-center">
                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm p-10">
                    {appState === 'submitting' && (
                        <div className="flex flex-col items-center gap-4">
                            <span className="w-12 h-12 border-4 border-ink-accent border-t-transparent rounded-full animate-spin" />
                            <h2 className="text-xl font-bold text-ink-text">Đang kích hoạt...</h2>
                            <p className="text-sm text-ink-textMuted">Vui lòng đợi trong giây lát</p>
                        </div>
                    )}

                    {/* Thành công/thất bại kích hoạt dùng xanh lá/đỏ ngữ nghĩa trạng
                        thái phổ quát (giống error icon các trang khác), KHÔNG dùng
                        ink-correct/ink-wrong — token đó chỉ dành cho chấm quiz. */}
                    {appState === 'success' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-ink-text mb-1">Kích hoạt thành công!</h2>
                                <p className="text-sm text-ink-textMuted">Tài khoản của bạn đã được kích hoạt.</p>
                                <p className="text-xs text-ink-textDim mt-3">Đang chuyển hướng về trang đăng nhập...</p>
                            </div>
                        </div>
                    )}

                    {appState === 'error' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-ink-text mb-1">Kích hoạt thất bại</h2>
                                <p className="text-sm text-ink-textMuted mb-5">{errorMessage}</p>
                                <button
                                    onClick={() => router.push('/join')}
                                    className="px-5 py-2.5 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2"
                                >
                                    Quay lại đăng nhập
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
