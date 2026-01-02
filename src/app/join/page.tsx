'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { identifyUser } from '@/lib/auth';
import { IdentifyRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';

type AppState = 'idle' | 'submitting' | 'redirecting' | 'error';

export default function JoinPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [continueUrl, setContinueUrl] = useState('/');
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Get continueUrl from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const url = urlParams.get('continueUrl') || '/';
        setContinueUrl(url);
    }, []);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setAppState('error');
            setErrorMessage('Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.');
            return;
        }

        try {
            setAppState('submitting');
            setErrorMessage(null);

            const request: IdentifyRequest = {
                email,
                continueUrl,
            };

            const response = await identifyUser(request);

            setAppState('redirecting');

            // Redirect based on action
            if (response.action === 'LOGIN') {
                router.push(`/login?email=${encodeURIComponent(email)}&continueUrl=${encodeURIComponent(response.continueUrl)}`);
            } else if (response.action === 'REGISTER') {
                router.push(`/register?email=${encodeURIComponent(email)}&continueUrl=${encodeURIComponent(response.continueUrl)}`);
            }
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header onJoin={() => router.push('/join')} />

            {/* Body */}
            <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Tham gia E-Learning Platform
                    </h2>
                    <p className="text-gray-600">
                        Nhập email của bạn để tiếp tục
                    </p>
                </div>

                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={appState === 'submitting' || appState === 'redirecting'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                placeholder="your@email.com"
                            />
                            <p className="mt-2 text-sm text-gray-500">Sẽ gửi hướng dẫn tiếp theo theo email của bạn.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={appState === 'submitting' || appState === 'redirecting'}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {appState === 'submitting' ? 'Đang xử lý...' :
                                appState === 'redirecting' ? 'Đang chuyển hướng...' :
                                    'Tiếp tục'}
                        </button>
                    </form>
                </div>

                {/* Error Toast */}
                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>
        </div>
    );
}
