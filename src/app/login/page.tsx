'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { AuthUtils } from '@/lib/auth';
import { LoginRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import { MARGIN_W } from '@/lib/vibe/theme';

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [continueUrl, setContinueUrl] = useState('/');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Get email and continueUrl from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email') || '';
        const continueParam = urlParams.get('continueUrl') || '/';
        setEmail(emailParam);
        setContinueUrl(continueParam);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppState('submitting');
        setErrorMessage(null);

        try {
            const request: LoginRequest = {
                email,
                password,
                continueUrl,
            };

            const response = await loginUser(request);

            // Success: Store tokens and redirect
            AuthUtils.setTokens(response.accessToken, response.refreshToken);
            setAppState('success');

            // Redirect to the specified URL or home
            const redirectUrl = response.redirectUrl || continueUrl || '/';
            router.push(redirectUrl);

        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi đăng nhập.');
        }
    };

    const handleChangeEmail = () => {
        // Navigate back to join gateway with current continueUrl
        router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
    };

    const handleForgotPassword = () => {
        // Navigate to forgot password page
        router.push('/forgot-password');
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-7 md:py-10">
                {/* Không có trang login trong vibe-demo — ADAPT (không phải port
                    nguyên trang): áp ngữ pháp "trang vở kẻ lề" đã chuẩn hoá ở
                    learn/my-learning/my-shares vào form — mỗi trường là một dòng
                    đánh số trong lề mono, đường kẻ mực dọc liên tục. Logic form
                    (handleSubmit, đổi email, quên mật khẩu) giữ nguyên 100%. */}
                <div className="mb-6">
                    <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Đăng nhập</h1>
                    <p className="text-sm text-ink-textMuted">Chào mừng bạn quay trở lại.</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        {/* Email Display */}
                        <div className="flex items-stretch pt-5">
                            <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim">
                                01
                            </span>
                            <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-4 pr-5 pb-4">
                                <label htmlFor="email" className="block text-sm font-medium text-ink-text mb-1.5">
                                    Email
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="flex-1 min-w-0 px-3 py-2.5 border border-ink-border rounded-lg text-sm bg-ink-page text-ink-textMuted"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleChangeEmail}
                                        className="vd-focusable text-sm text-ink-accent hover:text-ink-accent/80 font-medium whitespace-nowrap"
                                    >
                                        Thay đổi
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex items-stretch">
                            <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim">
                                02
                            </span>
                            <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-4 pr-5 pb-5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="block text-sm font-medium text-ink-text">
                                        Mật khẩu
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="vd-focusable text-xs text-ink-accent hover:text-ink-accent/80 font-medium"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent transition-shadow"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-stretch border-t border-ink-border">
                            <span style={{ width: MARGIN_W }} className="shrink-0" />
                            <div className="flex-1 border-l border-ink-marginLn py-4 pl-4 pr-5">
                                <button
                                    type="submit"
                                    disabled={appState === 'submitting'}
                                    className="vd-focusable w-full py-2.5 px-4 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {appState === 'submitting' && (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {appState === 'submitting' ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}
