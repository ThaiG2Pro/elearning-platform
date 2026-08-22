'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import { MARGIN_W } from '@/lib/vibe/theme';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'business_error' | 'system_error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Get token from URL params
        const tokenParam = searchParams.get('token') || '';
        setToken(tokenParam);

        // If no token, redirect to forgot password
        if (!tokenParam) {
            router.push('/forgot-password');
        }
    }, [searchParams, router]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppState('submitting');
        setErrorMessage(null);

        try {
            await resetPassword({
                token,
                password,
            });
            setAppState('success');
        } catch (error: any) {
            const message = error.message;
            if (message.includes('không hợp lệ') || message.includes('hết hạn')) {
                setAppState('business_error');
                setErrorMessage(message);
            } else {
                setAppState('system_error');
            }
        }
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-7 md:py-10">
                {/* ADAPT theo ngữ pháp "trang vở kẻ lề" (cùng login/register/
                    forgot-password) — logic token/redirect/mã lỗi giữ nguyên. */}
                <div className="mb-6">
                    <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Đặt lại mật khẩu</h1>
                    <p className="text-sm text-ink-textMuted">Nhập mật khẩu mới cho tài khoản.</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-stretch pt-5">
                            <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim">
                                01
                            </span>
                            <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-4 pr-5 pb-5">
                                <label htmlFor="password" className="block text-sm font-medium text-ink-text mb-1.5">
                                    Mật khẩu mới
                                </label>
                                <input
                                    id="password" name="password" type="password" autoComplete="new-password" required minLength={6}
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    disabled={appState === 'submitting'}
                                    className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow"
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                                <p className="mt-1.5 text-xs text-ink-textDim">Tránh dùng mật khẩu dễ đoán.</p>
                            </div>
                        </div>

                        <div className="flex items-stretch border-t border-ink-border">
                            <span style={{ width: MARGIN_W }} className="shrink-0" />
                            <div className="flex-1 border-l border-ink-marginLn py-4 pl-4 pr-5">
                                <button
                                    type="submit"
                                    disabled={appState === 'submitting' || !token}
                                    className="vd-focusable w-full py-2.5 px-4 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {appState === 'submitting' ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {appState === 'success' && (
                    <Toast message="Mật khẩu đã được cập nhật! Bạn có thể đăng nhập với mật khẩu mới." type="success" onClose={() => router.push('/join')} />
                )}
                {appState === 'business_error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
                {appState === 'system_error' && (
                    <Toast message="Có lỗi xảy ra. Vui lòng thử lại sau." type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-ink-page flex items-center justify-center">
                <span className="w-8 h-8 border-4 border-ink-accent border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
