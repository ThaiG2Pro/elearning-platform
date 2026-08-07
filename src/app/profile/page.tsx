'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { updateProfile, getProfile, logout as apiLogout, AuthUtils } from '@/lib/auth';
import { User } from '@/types/auth.types';

export default function EditProfilePage() {
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
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

    useEffect(() => {
        // Load current user profile
        const loadProfile = async () => {
            try {
                const profile = await getProfile();
                setEmail(profile.email);
                setFullName(profile.fullName);
                setAge(profile.age.toString());
            } catch (error) {
                console.error('Failed to load profile:', error);
                setAppState('system_error');
                setErrorMessage('Không thể tải hồ sơ. Vui lòng tải lại trang.');
            }
        };

        loadProfile();
    }, []);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppState('submitting');
        setErrorMessage(null);

        try {
            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum <= 0) {
                throw new Error('Tuổi phải là một số dương.');
            }

            await updateProfile({
                fullName: fullName.trim(),
                age: ageNum,
            });

            // WP1.5.12: update localStorage AND the `user` state driving the
            // Header avatar/name together — previously only localStorage was
            // updated, so the Header kept showing the stale name/initial
            // until a full page reload re-read it.
            const currentUser = AuthUtils.getCurrentUser();
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    fullName: fullName.trim(),
                };
                AuthUtils.setUserInfo(updatedUser);
                setUser(updatedUser);
            }

            setAppState('success');
        } catch (error: any) {
            const message = error.message;
            if (message && (message.includes('tuổi') || message.includes('không hợp lệ'))) {
                setAppState('business_error');
                setErrorMessage(message);
            } else {
                // WP1.5.12: this used to leave errorMessage null, so the error
                // banner below rendered nothing — a save failure looked like
                // nothing happened at all.
                setAppState('system_error');
                setErrorMessage('Có lỗi xảy ra, không thể lưu hồ sơ. Vui lòng thử lại.');
            }
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-lg mx-auto px-4 py-10">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Cập nhật thông tin tài khoản của bạn</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email (Read-only) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input
                                id="email" name="email" type="email" value={email} disabled
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-slate-400">Email không thể thay đổi</p>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên</label>
                            <input
                                id="fullName" name="fullName" type="text" required
                                value={fullName} onChange={(e) => setFullName(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-1.5">Tuổi</label>
                            <input
                                id="age" name="age" type="number" min="1" required
                                value={age} onChange={(e) => setAge(e.target.value)}
                                disabled={appState === 'submitting'}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-shadow"
                                placeholder="18"
                            />
                            {(appState === 'business_error' || appState === 'system_error') && errorMessage && (
                                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                            )}
                        </div>

                        {/* Success inline */}
                        {appState === 'success' && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                <p className="text-sm text-emerald-700 font-medium">Hồ sơ đã được cập nhật!</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={appState === 'submitting'} className="flex-1">
                                Hủy
                            </Button>
                            <Button type="submit" disabled={appState === 'submitting'} className="flex-1">
                                {appState === 'submitting' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {appState === 'submitting' ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
