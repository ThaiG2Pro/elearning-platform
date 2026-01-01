'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, getProfile, AuthUtils } from '@/lib/auth';

export default function EditProfilePage() {
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [appState, setAppState] = useState<'idle' | 'submitting' | 'success' | 'business_error' | 'system_error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();
    const user = AuthUtils.getCurrentUser();
    const avatarInitial = user ? getInitial(user.fullName) : 'U';

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

            // Update localStorage with new user info
            const currentUser = AuthUtils.getCurrentUser();
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    fullName: fullName.trim(),
                };
                AuthUtils.setUserInfo(updatedUser);
            }

            setAppState('success');
        } catch (error: any) {
            const message = error.message;
            if (message.includes('tuổi') || message.includes('không hợp lệ')) {
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
                        Cập nhật hồ sơ
                    </h2>
                    <p className="text-gray-600">
                        Cập nhật thông tin cá nhân của bạn
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email (Read-only) */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">Email không thể thay đổi</p>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                            Họ và tên
                        </label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập họ và tên"
                        />
                    </div>

                    {/* Age */}
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                            Tuổi
                        </label>
                        <input
                            id="age"
                            name="age"
                            type="number"
                            min="1"
                            required
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            disabled={appState === 'submitting'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            placeholder="Nhập tuổi"
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
                            {appState === 'submitting' ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>

                {/* Success Message */}
                {appState === 'success' && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-center">
                            <h3 className="text-sm font-medium text-green-800">
                                Hồ sơ đã được cập nhật thành công!
                            </h3>
                            <p className="mt-2 text-sm text-green-700">
                                Thông tin của bạn đã được lưu.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
