'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/auth.types';

interface AccountMenuProps {
    user: User;
    onLogout: () => void;
    /**
     * 'chip' — chip đầy đủ (avatar + tên + chevron) trong pill viền, dùng ở
     * TopBar variant="site" (Header.tsx). 'icon' — chỉ avatar tròn 26px,
     * không viền/không tên, khớp họ icon-button 26x26 của TopBar
     * variant="workspace" (trang học) — nơi không có chỗ cho tên đầy đủ và
     * mọi nút khác trong breadcrumb bar đều icon-only.
     */
    variant?: 'chip' | 'icon';
}

// 2026-09-04 — tách khỏi Header.tsx: trang học (learn/page.tsx) trước đây
// không có bất kỳ lối vào profile/đổi mật khẩu/đăng xuất nào một khi đã vào
// xem lesson (chỉ có link chữ "Spaces" quay lại danh sách). Đây là component
// dùng chung cho cả hai variant thay vì chép lại y hệt danh sách menu item ở
// nơi thứ hai — sửa 1 mục menu vẫn chỉ cần sửa 1 chỗ.
export default function AccountMenu({ user, onLogout, variant = 'chip' }: AccountMenuProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const getInitial = (fullName: string) => fullName.charAt(0).toUpperCase();

    const go = (path: string) => {
        setIsOpen(false);
        router.push(path);
    };

    const handleLogoutClick = () => {
        setIsOpen(false);
        onLogout();
    };

    const avatar = user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't support it
        <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
    ) : (
        <div className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold bg-ink-accent shrink-0">
            {getInitial(user.fullName)}
        </div>
    );

    return (
        <div className="relative">
            {variant === 'chip' ? (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="vd-focusable flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-ink-border hover:border-ink-borderHi hover:bg-ink-page transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-label="User menu"
                >
                    {avatar}
                    <span className="text-sm font-medium text-ink-text hidden sm:block max-w-[120px] truncate">{user.fullName}</span>
                    <svg className="w-3.5 h-3.5 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="vd-focusable flex items-center justify-center w-[26px] h-[26px] rounded-full overflow-hidden shrink-0"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-label="User menu"
                >
                    {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't support it
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-white text-[11px] font-semibold bg-ink-accent">
                            {getInitial(user.fullName)}
                        </div>
                    )}
                </button>
            )}

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-ink-panel rounded-ink-md shadow-lg border border-ink-border z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-ink-border bg-ink-page">
                            <p className="text-xs font-medium text-ink-textMuted uppercase tracking-wide">
                                Tài khoản cá nhân
                            </p>
                            <p className="text-sm font-semibold text-ink-text truncate mt-0.5">{user.fullName}</p>
                        </div>

                        <div className="py-1.5" role="menu">
                            <button onClick={() => go('/')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                                Trang chủ
                            </button>
                            <button onClick={() => go('/about')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Về chúng tôi
                            </button>
                            <button onClick={() => go('/my-learning')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                                Space đang học
                            </button>
                            <button onClick={() => go('/my-spaces')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                Space đã tạo
                            </button>
                            <button onClick={() => go('/my-shares')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342a4 4 0 010-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684zm0-9.316a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684z"/></svg>
                                Link chia sẻ của tôi
                            </button>
                            {/* 2026-09-05 — điểm chạm quản lý cho checkbox "Chia sẻ bản này cho
                                người khác dùng miễn phí" ở panel Tuỳ biến (AILessonComposer) —
                                trước đây tick xong là không có nơi nào xem/thu hồi lại. */}
                            <button onClick={() => go('/my-ai-shares')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                AI đã chia sẻ của tôi
                            </button>
                            <div className="mx-4 my-1 border-t border-ink-border" />
                            <button onClick={() => go('/profile')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                Sửa hồ sơ
                            </button>
                            <button onClick={() => go('/change-password')} role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-text hover:bg-ink-page w-full text-left transition-colors">
                                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                                Đổi mật khẩu
                            </button>
                            <div className="mx-4 my-1 border-t border-ink-border" />
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
    );
}
