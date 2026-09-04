'use client';

import { ReactNode } from 'react';
import { APP_TOP_BAR_H, TOP_BAR_H } from '@/lib/vibe/theme';

interface TopBarProps {
    /**
     * 'site' = chrome cấp-app (logo + nav + avatar): sticky, nằm trong flow,
     * căn giữa trong max-w-7xl, cao APP_TOP_BAR_H (56). Dùng bởi <Header>.
     * 'workspace' = breadcrumb bar của trang lesson: fixed toàn chiều rộng,
     * full-bleed px-7, cao TOP_BAR_H (52), đổi màu theo focus mode. Dùng bởi
     * trang học video. Hai chiều cao CỐ Ý khác nhau (xem theme.ts) — variant
     * tự chọn đúng token, caller không cần biết con số.
     */
    variant: 'site' | 'workspace';
    /** Chỉ 'workspace': bật nền "phòng tắt đèn" + chữ mực sáng mờ, nhịp 600ms. */
    focusMode?: boolean;
    /**
     * Chỉ 'site': hàng phụ tuỳ chọn render NGAY DƯỚI hàng chính, vẫn trong
     * cùng container max-w-7xl và cùng vỏ sticky/border — dùng cho sub-nav/tab
     * strip của các trang quản trị 1 space (vd. my-spaces/[id]/edit) thay vì
     * mỗi trang tự viết lại header rời có nguy cơ lệch z-index/height.
     */
    subRow?: ReactNode;
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
export default function TopBar({ variant, focusMode = false, subRow, children }: TopBarProps) {
    if (variant === 'workspace') {
        return (
            <div
                style={{ height: TOP_BAR_H }}
                // 2026-09-04 — cỡ chữ đồng bộ với TopBar variant="site" (14px):
                // trước đây workspace tự chốt 12.5px riêng, khiến breadcrumb bar
                // của trang học nhìn "nhỏ hơn hẳn" so với "/" và edit dù cùng
                // dùng chung vỏ TopBar — không có lý do ngữ nghĩa nào cho việc
                // lệch scale này (xem audit "ngôn ngữ thiết kế" 2026-09-04).
                className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-7 text-sm border-b transition-[background,border-color,color] duration-[600ms] ease-in-out ${
                    focusMode
                        ? 'bg-ink-room border-[rgba(244,246,252,0.10)] text-[rgba(244,246,252,0.45)]'
                        : 'bg-ink-panel border-ink-border text-ink-textMuted'
                }`}
            >
                {children}
            </div>
        );
    }

    // Site chrome — giữ sticky (không đổi sang fixed): fixed sẽ đẩy header ra
    // khỏi flow và bắt mọi trang thật thêm padding-top thủ công để bù, rủi ro
    // vỡ layout cao hơn nhiều lợi ích.
    return (
        <header className="bg-ink-panel border-b border-ink-border sticky top-0 z-30 shadow-ink-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center" style={{ height: APP_TOP_BAR_H }}>
                    {children}
                </div>
                {subRow}
            </div>
        </header>
    );
}
