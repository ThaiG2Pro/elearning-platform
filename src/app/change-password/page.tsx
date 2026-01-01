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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">E-Learning</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Avatar */}
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                                {avatarInitial}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Đổi mật khẩu
                    </h2>
                    <p className="text-gray-600">
                        Thay đổi mật khẩu tài khoản của bạn
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Password */}
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Mật khẩu hiện tại
                        </label>
                        <input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập mật khẩu hiện tại"
                        />
                    </div>

                    {/* New Password */}
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Mật khẩu mới
                        </label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        />
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập lại mật khẩu mới"
                        />
                        {appState === 'business_error' && errorMessage && (
                            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                        )}
                        {appState === 'system_error' && (
                            <p className="mt-2 text-sm text-red-600">Có lỗi xảy ra. Vui lòng thử lại sau.</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={appState === 'submitting'}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={appState === 'submitting'}
                            className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {appState === 'submitting' ? 'Đang đổi...' : 'Đổi mật khẩu'}
                        </button>
                    </div>
                </form>

                {/* Success Message */}
                {appState === 'success' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-center">
                            <h3 className="text-sm font-medium text-green-800">
                                Mật khẩu đã được thay đổi thành công!
                            </h3>
                            <p className="mt-2 text-sm text-green-700">
                                Bạn sẽ được đăng xuất để đăng nhập lại với mật khẩu mới.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
