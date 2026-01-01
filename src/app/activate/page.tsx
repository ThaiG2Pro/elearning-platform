'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { activateUser } from '@/lib/auth';
import { ActivateRequest } from '@/types/auth.types';

export default function ActivatePage() {
    const router = useRouter();

    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    }, []);

    const handleActivate = async (activationToken: string) => {
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
                <div className="text-center">
                    {appState === 'submitting' && (
                        <>
                            <div className="mb-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                Đang kích hoạt tài khoản...
                            </h2>
                            <p className="text-gray-600">
                                Vui lòng đợi trong giây lát
                            </p>
                        </>
                    )}

                    {appState === 'success' && (
                        <>
                            <div className="mb-8">
                                <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                Tài khoản đã được kích hoạt!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Chúc mừng! Tài khoản của bạn đã được kích hoạt thành công.
                            </p>
                            <p className="text-sm text-gray-500">
                                Bạn sẽ được chuyển hướng về trang đăng nhập trong vài giây...
                            </p>
                        </>
                    )}

                    {appState === 'error' && (
                        <>
                            <div className="mb-8">
                                <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto">
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                Kích hoạt thất bại
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {errorMessage}
                            </p>
                            <button
                                onClick={() => router.push('/join')}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Quay lại trang đăng nhập
                            </button>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
