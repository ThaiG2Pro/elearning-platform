'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword, AuthUtils } from '@/lib/auth';

export default function ChangePasswordPage() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'business_error' | 'system_error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();
    const user = AuthUtils.getCurrentUser();
    const avatarInitial = user ? getInitial(user.fullName) : 'U';

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
        <div className="min-h-screen bg-slate-50">
            {/* Compact header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <button onClick={() => router.push('/')} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">E</span>
                            </div>
                            <span className="font-semibold text-slate-900 text-base hidden sm:block">E-Learning</span>
                        </button>
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {avatarInitial}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-10">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900">Đổi mật khẩu</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Thay đổi mật khẩu đăng nhập của bạn</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
                            <input
                                id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required
                                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu mới</label>
                            <input
                                id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={6}
                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="Tối thiểu 6 ký tự"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Xác nhận mật khẩu mới</label>
                            <input
                                id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="Nhập lại mật khẩu mới"
                            />
                            {(appState === 'business_error' || appState === 'system_error') && errorMessage && (
                                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                            )}
                        </div>

                        {appState === 'success' && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                <p className="text-sm text-emerald-700 font-medium">Mật khẩu đã được thay đổi thành công!</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={handleCancel} disabled={appState === 'submitting'}
                                className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50">
                                Hủy
                            </button>
                            <button type="submit" disabled={appState === 'submitting'}
                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2">
                                {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {appState === 'submitting' ? 'Đang đổi...' : 'Đổi mật khẩu'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
