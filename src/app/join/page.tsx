'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { identifyUser } from '@/lib/auth';
import { IdentifyRequest } from '@/types/auth.types';
import Header from '@/components/Header';
import Toast from '@/components/Toast';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';

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
        <div className="min-h-screen bg-ink-page">
            <Header onJoin={() => router.push('/join')} />

            <main className="max-w-md mx-auto px-4 py-12">
                {/* Logo + Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-ink-md bg-ink-accent mb-4">
                        <span className="text-white font-bold text-xl">E</span>
                    </div>
                    <h1 className="text-2xl font-bold text-ink-text mb-1">Bắt đầu ngay</h1>
                    <p className="text-sm text-ink-textMuted">Nhập email của bạn để tiếp tục</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-ink-text mb-1.5">
                                Địa chỉ Email
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
                                className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 disabled:bg-ink-page transition-shadow"
                                placeholder="your@email.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={appState === 'submitting' || appState === 'redirecting'}
                            className="w-full py-2.5 px-4 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink-accent focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {(appState === 'submitting' || appState === 'redirecting') && (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            {appState === 'submitting' ? 'Đang xử lý...' :
                                appState === 'redirecting' ? 'Đang chuyển...' : 'Tiếp tục →'}
                        </button>
                    </form>
                </div>

                {appState === 'error' && errorMessage && (
                    <Toast message={errorMessage} type="error" onClose={() => setAppState('idle')} />
                )}
            </main>

            {/* Sales Agent — appears after 4s on join page (user is deciding whether to sign up) */}
            <SalesAgentWidget context="join" />
        </div>
    );
}
