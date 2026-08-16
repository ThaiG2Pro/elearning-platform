'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types/auth.types';

interface HeaderProps {
    user?: User | null;
    onLogout?: () => void;
    onJoin?: () => void;
}

// WP1.8 — passive donate link, bật từ ngày đầu (Vision mục 7 / wayfinder ticket
// 09): khung chữ "ủng hộ" trung tính, không gate feature nào theo nó, không
// logic subscription. URL cấu hình qua env để đổi provider (Ko-fi/GitHub
// Sponsors) mà không cần sửa code; ẩn hẳn nút nếu chưa cấu hình thay vì trỏ
// tới một link giả.
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL;

export default function Header({ user, onLogout, onJoin }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();
    const avatarColor = 'bg-blue-600 hover:bg-blue-700';

    const handleHomeClick = () => {
        setIsDropdownOpen(false);
        router.push('/');
    };

    const handleAboutClick = () => {
        setIsDropdownOpen(false);
        router.push('/about');
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
        router.push('/my-courses');
    };

    const handleMySharesClick = () => {
        setIsDropdownOpen(false);
        router.push('/my-shares');
    };



    const handleLogoutClick = () => {
        setIsDropdownOpen(false);
        onLogout?.();
    };

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo & Main Nav */}
                    <div className="flex items-center gap-6 sm:gap-8">
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

                        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main Navigation">
                            <button
                                onClick={handleHomeClick}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === '/'
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                Trang chủ
                            </button>
                            <button
                                onClick={handleAboutClick}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    pathname === '/about'
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                Về chúng tôi
                            </button>
                        </nav>
                    </div>

                    {/* Account Area */}
                    <div className="flex items-center gap-3">
                        {DONATE_URL && (
                            <a
                                href={DONATE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors"
                                aria-label="Ủng hộ dự án"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 010-6.364c1.757-1.757 4.607-1.757 6.364 0L12 1.272l1.318-1.318c1.757-1.757 4.607-1.757 6.364 0a4.5 4.5 0 010 6.364L12 15.636 4.318 7.954z" transform="translate(0 4)" />
                                </svg>
                                Ủng hộ
                            </a>
                        )}
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
                                    {user.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't support it
                                        <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold ${avatarColor.split(' ')[0]}`}>
                                            {getInitial(user.fullName)}
                                        </div>
                                    )}
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
                                                <button onClick={handleAboutClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                    Về chúng tôi
                                                </button>
                                                <button onClick={handleMyLearningClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                                                    Space đang học
                                                </button>
                                                <button onClick={handleMyCoursesClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                                    Space đã tạo
                                                </button>
                                                <button onClick={handleMySharesClick} role="menuitem"
                                                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left transition-colors">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342a4 4 0 010-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684zm0-9.316a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684z"/></svg>
                                                    Link chia sẻ của tôi
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
