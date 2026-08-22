'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { changePassword, logout as apiLogout, AuthUtils } from '@/lib/auth';
import { User } from '@/types/auth.types';
import { MARGIN_W } from '@/lib/vibe/theme';

export default function ChangePasswordPage() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'business_error' | 'system_error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (AuthUtils.isAuthenticated()) {
            setUser(AuthUtils.getCurrentUser());
        }
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } catch (error) {
            // ignore — still clear local session and navigate away
        } finally {
            setUser(null);
            router.push('/');
        }
    };

    const handleJoin = () => {
        const currentUrl = window.location.pathname;
        router.push(`/join?continueUrl=${encodeURIComponent(currentUrl)}`);
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppState('submitting');
        setErrorMessage(null);

        // Client-side validation
        if (newPassword !== confirmPassword) {
            setAppState('business_error');
            setErrorMessage('Xác nhận mật khẩu mới không trùng khớp.');
            return;
        }

        if (newPassword.length < 6) {
            setAppState('business_error');
            setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        try {
            await changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            setAppState('success');
        } catch (error: any) {
            const message = error.message;
            if (message.includes('không chính xác') || message.includes('không trùng khớp') || message.includes('6 ký tự')) {
                setAppState('business_error');
                setErrorMessage(message);
            } else {
                setAppState('system_error');
            }
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-lg mx-auto px-4 py-7 md:py-10">
                {/* ADAPT theo ngữ pháp "trang vở kẻ lề" (cùng các trang auth) —
                    logic validate/đổi mật khẩu giữ nguyên 100%. */}
                <div className="mb-6">
                    <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text">Đổi mật khẩu</h1>
                    <p className="text-sm text-ink-textMuted mt-0.5">Thay đổi mật khẩu đăng nhập của bạn.</p>
                </div>

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        {[
                            {
                                n: '01', field: (
                                    <>
                                        <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-text mb-1.5">Mật khẩu hiện tại</label>
                                        <input
                                            id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required
                                            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text placeholder:text-ink-textDim focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow"
                                            placeholder="••••••••"
                                        />
                                    </>
                                )
                            },
                            {
                                n: '02', field: (
                                    <>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-ink-text mb-1.5">Mật khẩu mới</label>
                                        <input
                                            id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={6}
                                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text placeholder:text-ink-textDim focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow"
                                            placeholder="Tối thiểu 6 ký tự"
                                        />
                                    </>
                                )
                            },
                            {
                                n: '03', field: (
                                    <>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-text mb-1.5">Xác nhận mật khẩu mới</label>
                                        <input
                                            id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={appState === 'submitting'}
                                            className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm text-ink-text placeholder:text-ink-textDim focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent disabled:opacity-50 transition-shadow"
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                        {(appState === 'business_error' || appState === 'system_error') && errorMessage && (
                                            <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                                        )}
                                    </>
                                )
                            },
                        ].map((row, i) => (
                            <div key={row.n} className={`flex items-stretch ${i === 0 ? 'pt-5' : ''}`}>
                                <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim">
                                    {row.n}
                                </span>
                                <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-4 pr-5 pb-4">
                                    {row.field}
                                </div>
                            </div>
                        ))}

                        <div className="flex items-stretch border-t border-ink-border">
                            <span style={{ width: MARGIN_W }} className="shrink-0" />
                            <div className="flex-1 border-l border-ink-marginLn py-4 pl-4 pr-5">
                                {appState === 'success' && (
                                    <div className="vd-ink-in flex items-center gap-2 p-3 mb-3 bg-ink-page border border-ink-border rounded-lg">
                                        <svg className="w-4 h-4 text-ink-textMid flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                        <p className="text-sm text-ink-textMid font-medium">Mật khẩu đã được thay đổi thành công!</p>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={handleCancel} disabled={appState === 'submitting'} className="flex-1">
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={appState === 'submitting'} className="flex-1">
                                        {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                        {appState === 'submitting' ? 'Đang đổi...' : 'Đổi mật khẩu'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
