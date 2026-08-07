'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/auth.types';

interface HeaderProps {
    user?: User | null;
    onLogout?: () => void;
    onJoin?: () => void;
}

const roleAvatarColor: Record<string, string> = {
    STUDENT: 'bg-blue-600 hover:bg-blue-700',
    LECTURER: 'bg-indigo-600 hover:bg-indigo-700',
    ADMIN: 'bg-slate-700 hover:bg-slate-800',
};

export default function Header({ user, onLogout, onJoin }: HeaderProps) {
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();
    const avatarColor = user ? (roleAvatarColor[user.role] ?? 'bg-blue-600 hover:bg-blue-700') : '';

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



    const handleLogoutClick = () => {
        setIsDropdownOpen(false);
        onLogout?.();
    };

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
                        aria-label="Trang chủ"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">E</span>
                        </div>
                        <span className="font-semibold text-slate-900 text-base hidden sm:block">E-Learning</span>
                    </button>

                    {/* Account Area */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="relative">
                                {/* User info chip */}
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                    aria-haspopup="menu"
                                    aria-expanded={isDropdownOpen}
                                    aria-label="User menu"
                                >
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold ${avatarColor.split(' ')[0]}`}>
                                        {getInitial(user.fullName)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[120px] truncate">{user.fullName}</span>
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 z-20 overflow-hidden">
                                            {/* User info header */}
                                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                    Tài khoản cá nhân
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user.fullName}</p>
                                            </div>

                                            <div className="py-1.5" role="menu">
                                                <button onClick={handleHomeClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                                                    Trang chủ
                                                </button>
                                                <button onClick={handleMyLearningClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                                                    Khóa học đang học
                                                </button>
                                                <button onClick={handleMyCoursesClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                                    Khóa học đã tạo
                                                </button>
                                                <div className="mx-4 my-1 border-t border-slate-100" />
                                                <button onClick={handleProfileClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                                    Sửa hồ sơ
                                                </button>
                                                <button onClick={handleChangePasswordClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                                                    Đổi mật khẩu
                                                </button>
                                                <div className="mx-4 my-1 border-t border-slate-100" />
                                                <button onClick={handleLogoutClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                                    Đăng xuất
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onJoin}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
