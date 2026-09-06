'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { APP_TOP_BAR_H, TOP_BAR_H } from '@/lib/vibe/theme';

interface TopBarProps {
    /**
     * 'site' = chrome cấp-app (brand mark + nav + avatar): sticky, nằm trong
     * flow, căn giữa trong max-w-7xl, cao APP_TOP_BAR_H (56). Dùng bởi <Header>.
     * 'workspace' = breadcrumb bar của trang lesson: sticky, full-bleed px-7,
     * cao TOP_BAR_H (56), đổi màu theo focus mode. Dùng bởi trang học video.
     * 2026-09-05 — cả 2 giờ CÙNG là sticky và CÙNG cao 56 (xem audit "Hệ
     * Thống Header"): trước đây workspace tự chốt fixed + 52, không có lý do
     * ngữ cảnh nào cho 2 lệch này — chỉ có focus mode (đổi màu) là khác biệt
     * thật sự còn lại giữa 2 variant.
     */
    variant: 'site' | 'workspace';
    /** Chỉ 'workspace': bật nền "phòng tắt đèn" + chữ mực sáng mờ, nhịp 600ms. */
    focusMode?: boolean;
    children: ReactNode;
}

/**
 * Vỏ thanh trên cùng dùng chung — gom đúng phần "khung xương" (positioning,
 * chiều cao token, border, theming focus-mode) mà cả site-chrome lẫn breadcrumb
 * bar vốn lặp lại y hệt. KHÔNG gộp nội dung: mỗi caller tự đổ children của
 * mình vào. Đây là mức "một header đồng nhất" tối đa mà không tạo coupling giả
 * giữa hai ngữ cảnh điều hướng khác bản chất (đổi focus-mode không đụng dropdown
 * account, và ngược lại). Một import, một chỗ duy nhất giữ hợp đồng của thanh bar.
 */
// 2026-09-05 — "Hệ Thống Header" (xem audit cùng tên): brand mark trước đây
// mỗi trang tự quyết định có vẽ hay không (Home có, Learn/Edit không có gì
// cả) — không có ngữ cảnh nào biện minh việc thiếu hẳn neo thương hiệu này,
// nên nó chuyển vào ĐÂY, do TopBar tự vẽ ở mọi variant, thay vì để từng
// trang tự chọn. Cũng là điểm "về gốc" DUY NHẤT (luôn → "/"): breadcrumb
// của từng trang chỉ còn việc thêm các đoạn SAU nó, không tự vẽ đoạn đầu.
function BrandMark({ workspace = false }: { workspace?: boolean }) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.push('/')}
            aria-label="Trang chủ"
            title="Trang chủ"
            className="vd-focusable flex items-center gap-2 shrink-0 rounded-md"
        >
            <span
                className={`flex items-center justify-center rounded-lg bg-ink-accent text-white font-bold shrink-0 ${
                    workspace ? 'w-[26px] h-[26px] text-[11px]' : 'w-8 h-8 text-sm'
                }`}
            >
                E
            </span>
            {!workspace && (
                <span className="font-semibold text-ink-text text-base hidden sm:block whitespace-nowrap">E-Learning</span>
            )}
        </button>
    );
}

export default function TopBar({ variant, focusMode = false, children }: TopBarProps) {
    if (variant === 'workspace') {
        return (
            <div
                style={{ height: TOP_BAR_H }}
                // 2026-09-04 — cỡ chữ đồng bộ với TopBar variant="site" (14px):
                // trước đây workspace tự chốt 12.5px riêng, khiến breadcrumb bar
                // của trang học nhìn "nhỏ hơn hẳn" so với "/" và edit dù cùng
                // dùng chung vỏ TopBar — không có lý do ngữ nghĩa nào cho việc
                // lệch scale này (xem audit "ngôn ngữ thiết kế" 2026-09-04).
                // 2026-09-05 — đổi fixed → sticky, 52 → 56 (xem audit "Hệ Thống
                // Header"): trang học khoá cuộn document ở cấp html/body và tự
                // định vị mọi lớp bên dưới bằng TOP_BAR_H (không bằng CSS
                // position của chính bar này), nên sticky render giống hệt fixed
                // ở đây — đổi an toàn, không cần sửa page.tsx. z-50 giữ nguyên vì
                // vẫn phải nổi trên content wrapper (z-1) và focus panel (z-40).
                className={`sticky top-0 z-50 flex items-center gap-2 px-7 text-sm border-b transition-[background,border-color,color] duration-[600ms] ease-in-out ${
                    focusMode
                        ? 'bg-ink-room border-[rgba(244,246,252,0.10)] text-[rgba(244,246,252,0.45)]'
                        : 'bg-ink-panel border-ink-border text-ink-textMuted'
                }`}
            >
                <BrandMark workspace />
                {children}
            </div>
        );
    }

    // Site chrome — giữ sticky (không đổi sang fixed): fixed sẽ đẩy header ra
    // khỏi flow và bắt mọi trang thật thêm padding-top thủ công để bù, rủi ro
    // vỡ layout cao hơn nhiều lợi ích.
    // 2026-09-05 — bỏ wrapper `max-w-7xl mx-auto` khỏi CHÍNH thanh header (xem
    // audit "Hệ Thống Header"): mọi app lớn có chrome cấp-app (YouTube, Gmail,
    // GitHub, Notion, Linear...) đều để thanh header full-bleed hết chiều
    // ngang cửa sổ, TÁCH RIÊNG khỏi việc content bên dưới nó có bị giới hạn
    // max-width hay không — trói header vào cùng max-width với content (như
    // trước đây) làm logo/nav "lơ lửng" giữa 2 dải trắng trên màn rất rộng
    // thay vì bám mép cửa sổ thật. `max-w-7xl` vẫn còn — chỉ chuyển xuống
    // đúng chỗ của nó: bên trong <main> của từng trang, không còn ở đây.
    return (
        <header className="bg-ink-panel border-b border-ink-border sticky top-0 z-30 shadow-ink-sm">
            <div className="flex items-center gap-4 px-4 sm:px-6 lg:px-7" style={{ height: APP_TOP_BAR_H }}>
                <BrandMark />
                <div className="flex-1 min-w-0 flex justify-between items-center">
                    {children}
                </div>
            </div>
        </header>
    );
}
