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
        <div className="min-h-screen bg-slate-50">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
                        <span className="text-white font-bold text-xl">E</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Đặt lại mật khẩu</h1>
                    <p className="text-sm text-slate-500">Nhập mật khẩu mới cho tài khoản</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Mật khẩu mới
                            </label>
                            <input
                                id="password" name="password" type="password" autoComplete="new-password" required minLength={6}
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="Tối thiểu 6 ký tự"
                            />
                            <p className="mt-1.5 text-xs text-slate-400">Tránh dùng mật khẩu dễ đoán.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={appState === 'submitting' || !token}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {appState === 'submitting' ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </button>
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
