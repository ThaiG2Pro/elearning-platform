'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { AuthUtils } from '@/lib/auth';
import { LoginRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';

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

            <main className="max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-ink-md bg-ink-accent mb-4">
                        <span className="text-white font-bold text-xl">E</span>
                    </div>
                    <h1 className="text-2xl font-bold text-ink-text mb-1">Đăng nhập</h1>
                    <p className="text-sm text-ink-textMuted">Chào mừng bạn quay trở lại</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Display */}
                        <div>
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
                                    className="flex-1 px-3 py-2.5 border border-ink-border rounded-lg text-sm bg-ink-page text-ink-textMuted"
                                />
                                <button
                                    type="button"
                                    onClick={handleChangeEmail}
                                    className="text-sm text-ink-accent hover:text-ink-accent/80 font-medium whitespace-nowrap"
                                >
                                    Thay đổi
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-ink-text">
                                    Mật khẩu
                                </label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs text-ink-accent hover:text-ink-accent/80 font-medium"
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

                        <button
                            type="submit"
                            disabled={appState === 'submitting'}
                            className="w-full py-2.5 px-4 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {appState === 'submitting' && (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            {appState === 'submitting' ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>
                </div>

                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}
