'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/auth.types';

interface HeaderProps {
    user?: User | null;
    onLogout?: () => void;
    onJoin?: () => void;
}

export default function Header({ user, onLogout, onJoin }: HeaderProps) {
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();

    const handleHomeClick = () => {
        setIsDropdownOpen(false);
        router.push('/');
    };

    const handleProfileClick = () => {
        setIsDropdownOpen(false);
        router.push('/profile');
    };

    const handleChangePasswordClick = () => {
        setIsDropdownOpen(false);
        router.push('/change-password');
    };

    const handleMyLearningClick = () => {
        setIsDropdownOpen(false);
        router.push('/my-learning');
    };

    const handleMyCoursesClick = () => {
        setIsDropdownOpen(false);
        router.push('/lecturer/courses');
    };

    const handlePendingQueueClick = () => {
        setIsDropdownOpen(false);
        router.push('/admin/approval-queue');
    };

    const handleLogoutClick = () => {
        setIsDropdownOpen(false);
        onLogout?.();
    };

    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <button
                            onClick={() => router.push('/')}
                            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                            E-Learning
                        </button>
                    </div>

                    {/* Account Area */}
                    <div className="flex items-center">
                        {user ? (
                            <div className="relative">
                                {/* Avatar Button */}
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors"
                                >
                                    {getInitial(user.fullName)}
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                        <div className="py-1">
                                            <button
                                                onClick={handleHomeClick}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                Trang chủ
                                            </button>
                                            {user.role === 'STUDENT' && (
                                                <button
                                                    onClick={handleMyLearningClick}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                                >
                                                    Khóa học của tôi
                                                </button>
                                            )}
                                            {user.role === 'LECTURER' && (
                                                <button
                                                    onClick={handleMyCoursesClick}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                                >
                                                    Khóa học của tôi
                                                </button>
                                            )}
                                            {user.role === 'ADMIN' && (
                                                <button
                                                    onClick={handlePendingQueueClick}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                                >
                                                    Danh sách chờ duyệt
                                                </button>
                                            )}
                                            <button
                                                onClick={handleProfileClick}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                Sửa hồ sơ
                                            </button>
                                            <button
                                                onClick={handleChangePasswordClick}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                Đổi mật khẩu
                                            </button>
                                            <button
                                                onClick={handleLogoutClick}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                            >
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onJoin}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                                Tham gia
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
