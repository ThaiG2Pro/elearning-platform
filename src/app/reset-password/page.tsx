'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';

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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center h-16">
                        <h1 className="text-xl font-bold text-gray-900">E-Learning</h1>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Thiết lập mật khẩu mới
                    </h2>
                    <p className="text-gray-600">
                        Nhập mật khẩu mới cho tài khoản của bạn
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* New Password Input */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Mật khẩu mới
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        />
                        {appState === 'business_error' && errorMessage && (
                            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                        )}
                        {appState === 'system_error' && (
                            <p className="mt-2 text-sm text-red-600">Có lỗi xảy ra. Vui lòng thử lại sau.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={appState === 'submitting' || !token}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {appState === 'submitting' ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                </form>

                {/* Success Message */}
                {appState === 'success' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-center">
                            <h3 className="text-sm font-medium text-green-800">
                                Mật khẩu đã được cập nhật!
                            </h3>
                            <p className="mt-2 text-sm text-green-700">
                                Bạn có thể đăng nhập với mật khẩu mới.
                            </p>
                            <button
                                onClick={() => router.push('/join')}
                                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                            >
                                Đăng nhập ngay
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
