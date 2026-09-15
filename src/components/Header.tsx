'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { User } from '@/types/auth.types';
import TopBar from '@/components/vibe/TopBar';
import AccountMenu from '@/components/AccountMenu';
import { APP_TOP_BAR_H } from '@/lib/vibe/theme';

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

// Nav khai báo dạng danh sách thay vì lặp lại 1 khối JSX/route — thêm
// /pricing, /guide, /faq (đang là 3 trang rỗng cần route) chỉ là thêm 1 dòng
// thay vì chép lại cả khối button.
const NAV_ITEMS: { href: string; label: string }[] = [
    { href: '/', label: 'Trang chủ' },
    { href: '/pricing', label: 'Bảng giá' },
    { href: '/guide', label: 'Hướng dẫn' },
    { href: '/faq', label: 'Hỏi đáp' },
    { href: '/about', label: 'Về chúng tôi' },
];

// Responsive (2026-09-15): dưới md, 5 mục nav + nút "Tham gia" không đủ chỗ
// và nav từng tràn ngang (overflow-x-auto) — người dùng phải kéo trong thanh
// bar, nút CTA bị cắt. Giờ: md trở lên giữ nav ngang như cũ; dưới md ẩn nav,
// hiện 1 nút menu mở panel dọc ngay dưới thanh bar. Logo và CTA/avatar luôn
// còn — đó là 2 thứ người ta cần thấy ở mọi khổ màn hình.
export default function Header({ user, onLogout, onJoin }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    // Đóng panel khi đổi trang (bấm 1 mục) và khi phóng to lên desktop.
    useEffect(() => { setMenuOpen(false); }, [pathname]);
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    const navButtonClass = (href: string, mobile: boolean) =>
        mobile
            ? `vd-focusable w-full text-left px-4 py-3 text-[15px] border-l-2 transition-colors ${
                  pathname === href
                      ? 'border-ink-accent text-ink-text font-semibold bg-ink-accentA'
                      : 'border-transparent text-ink-textMid hover:text-ink-text hover:bg-ink-page'
              }`
            : `vd-focusable whitespace-nowrap px-1 py-1.5 border-b-2 text-sm font-medium transition-colors ${
                  pathname === href
                      ? 'border-ink-accent text-ink-text font-semibold'
                      : 'border-transparent text-ink-textMuted hover:text-ink-text'
              }`;

    return (
        // Vỏ bar (sticky, chiều cao APP_TOP_BAR_H, border, căn giữa max-w-7xl)
        // nằm trong <TopBar variant="site"> dùng chung với breadcrumb bar
        // trang học — nav vẫn dùng motif "gạch chân accent khi active".
        <TopBar variant="site">
            {/* Nav ngang — chỉ từ md */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-6" aria-label="Main Navigation">
                {NAV_ITEMS.map((item) => (
                    <button key={item.href} onClick={() => router.push(item.href)} className={navButtonClass(item.href, false)}>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Account Area */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                {DONATE_URL && (
                    <a
                        href={DONATE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vd-focusable hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-ink-textMuted hover:text-ink-accent transition-colors whitespace-nowrap"
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
                        className="vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium px-3.5 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Tham gia
                    </button>
                )}
                {/* Nút menu — chỉ dưới md, đặt sau CTA để ngón cái phải với tới. */}
                <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="vd-focusable md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-ink-text hover:bg-ink-page transition-colors"
                    aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                    aria-expanded={menuOpen}
                    aria-controls="site-mobile-nav"
                >
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Panel nav dọc — dưới md. Nằm ngay dưới thanh bar (top = chiều cao
                bar), full width, che phần còn lại bằng lớp mờ bấm để đóng. */}
            {menuOpen && (
                <>
                    <div
                        className="md:hidden fixed inset-x-0 bottom-0 z-20 bg-ink-text/20"
                        style={{ top: APP_TOP_BAR_H }}
                        onClick={() => setMenuOpen(false)}
                        aria-hidden
                    />
                    <nav
                        id="site-mobile-nav"
                        aria-label="Main Navigation"
                        className="md:hidden fixed inset-x-0 z-30 bg-ink-panel border-b border-ink-border shadow-ink-md py-2"
                        style={{ top: APP_TOP_BAR_H }}
                    >
                        {NAV_ITEMS.map((item) => (
                            <button key={item.href} onClick={() => router.push(item.href)} className={navButtonClass(item.href, true)}>
                                {item.label}
                            </button>
                        ))}
                        {DONATE_URL && (
                            <a
                                href={DONATE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vd-focusable block px-4 py-3 text-[15px] border-l-2 border-transparent text-ink-textMid hover:text-ink-text hover:bg-ink-page"
                            >
                                Ủng hộ dự án
                            </a>
                        )}
                    </nav>
                </>
            )}
        </TopBar>
    );
}
