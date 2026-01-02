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
        <div className="min-h-screen bg-gray-50">
            <Header onJoin={() => router.push('/join')} />

            {/* Body */}
            <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                        Đăng nhập
                    </h2>
                    <p className="text-gray-600">
                        Chào mừng bạn quay trở lại — tiếp tục hành trình học tập của bạn.
                    </p>
                </div>

                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Display */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="flex items-center">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleChangeEmail}
                                    className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    Thay đổi
                                </button>
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-2 text-sm text-gray-500">Mật khẩu của bạn được bảo mật. Nếu quên, bạn có thể đặt lại.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={appState === 'submitting'}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {appState === 'submitting' ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleForgotPassword}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Quên mật khẩu?
                        </button>
                    </div>
                </div>

                {/* Inline Toast for errors */}
                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}
