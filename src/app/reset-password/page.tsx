'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import Header from '@/components/Header';
import Toast from '@/components/Toast';

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
            <Header onJoin={() => router.push('/join')} />

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

                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
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
                            <p className="mt-2 text-sm text-gray-500">Mật khẩu nên có ít nhất 6 ký tự. Tránh dùng mật khẩu dễ đoán.</p>
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
                </div>

                {/* Success Toast */}
                {appState === 'success' && (
                    <Toast message="Mật khẩu đã được cập nhật! Bạn có thể đăng nhập với mật khẩu mới." type="success" onClose={() => router.push('/join')} />
                )}

                {/* Error Toasts */}
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
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
