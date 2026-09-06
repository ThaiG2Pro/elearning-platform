'use client';

import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types/auth.types';
import TopBar from '@/components/vibe/TopBar';
import AccountMenu from '@/components/AccountMenu';

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
    const handleHomeClick = () => router.push('/');
    const handleAboutClick = () => router.push('/about');

    return (
        // Vỏ bar (sticky, chiều cao APP_TOP_BAR_H, border, căn giữa max-w-7xl)
        // giờ nằm trong <TopBar variant="site"> dùng chung với breadcrumb bar
        // trang học — nav vẫn dùng motif "gạch chân accent khi active".
        // 2026-09-05 — brand mark ("E" + "E-Learning") không còn tự vẽ ở đây:
        // TopBar giờ vẽ nó ở MỌI variant (xem audit "Hệ Thống Header"), Header
        // chỉ còn cần khai báo nav.
        <TopBar variant="site">
            {/* Main Nav */}
                    <div className="flex items-center gap-6 sm:gap-8">
                        <nav className="flex items-center gap-1 sm:gap-5 overflow-x-auto" aria-label="Main Navigation">
                            <button
                                onClick={handleHomeClick}
                                className={`vd-focusable whitespace-nowrap px-1 py-1.5 border-b-2 text-sm font-medium transition-colors ${
                                    pathname === '/'
                                        ? 'border-ink-accent text-ink-text font-semibold'
                                        : 'border-transparent text-ink-textMuted hover:text-ink-text'
                                }`}
                            >
                                Trang chủ
                            </button>
                            <button
                                onClick={handleAboutClick}
                                className={`vd-focusable whitespace-nowrap px-1 py-1.5 border-b-2 text-sm font-medium transition-colors ${
                                    pathname === '/about'
                                        ? 'border-ink-accent text-ink-text font-semibold'
                                        : 'border-transparent text-ink-textMuted hover:text-ink-text'
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
                                className="vd-focusable hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-ink-textMuted hover:text-ink-accent transition-colors"
                                aria-label="Ủng hộ dự án"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 010-6.364c1.757-1.757 4.607-1.757 6.364 0L12 1.272l1.318-1.318c1.757-1.757 4.607-1.757 6.364 0a4.5 4.5 0 010 6.364L12 15.636 4.318 7.954z" transform="translate(0 4)" />
                                </svg>
                                Ủng hộ
                            </a>
                        )}
                        {user ? (
                            <AccountMenu user={user} onLogout={() => onLogout?.()} variant="chip" />
                        ) : (
                            <button
                                onClick={onJoin}
                                className="vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                Tham gia
                            </button>
                        )}
                    </div>
        </TopBar>
    );
}
