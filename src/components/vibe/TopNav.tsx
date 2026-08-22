'use client';

// TopNav dùng chung cho các trang app-level (home/about/spaces) — khác với
// breadcrumb top-bar của trang lesson (video/quiz/article), vì hai ngữ cảnh
// điều hướng (duyệt app vs. đang trong 1 bài học) cần phân biệt được bằng
// mắt dù dùng chung token/panel/border/accent. Trước đây bị định nghĩa lại
// giống hệt nhau ở cả 3 file home/about/spaces.
import React from 'react';
import { T, APP_TOP_BAR_H, useIsCompact } from '@/lib/vibe/theme';

export type TopNavKey = 'home' | 'spaces' | 'about';

// shortLabel: dùng khi màn hẹp — chỉ "Không gian của tôi" đủ dài để cần rút
// gọn, 2 label còn lại giữ nguyên nên không khai báo shortLabel riêng.
const NAV_ITEMS: { key: TopNavKey; label: string; shortLabel?: string; href: string }[] = [
  { key: 'home',   label: 'Trang chủ',          href: '/vibe-demo/home' },
  { key: 'spaces', label: 'Không gian của tôi', shortLabel: 'Không gian', href: '/vibe-demo/spaces' },
  { key: 'about',  label: 'Giới thiệu',          href: '/vibe-demo/about' },
];

export function TopNav({ active }: { active: TopNavKey }) {
  // Mục 2 — bug thật do user test trên mobile: TopNav trước đây không có
  // `whiteSpace: nowrap` trên chữ, nên ở màn hẹp các mục nav ("Trang chủ",
  // "Không gian của tôi", "Giới thiệu") bị flex ép co lại và WORD-WRAP xuống
  // nhiều dòng — thanh nav có chiều cao cố định (APP_TOP_BAR_H) căn giữa
  // theo chiều dọc, nên chỉ dòng giữa mỗi chữ còn lọt vào khung nhìn, phần
  // trên/dưới bị cắt (đúng hiện tượng "chủ" / "gian của tôi" / "thiệu" rời
  // rạc trong ảnh chụp). Sửa 2 lớp: (1) `whiteSpace:'nowrap'` triệt tiêu
  // hẳn khả năng word-wrap dọc — dù màn có hẹp cỡ nào, chữ cũng không bao
  // giờ vỡ dòng kiểu đó nữa; (2) ở màn hẹp, rút gọn để đỡ phải cuộn: giấu
  // chữ "Spaces" (còn icon), rút "Không gian của tôi" → "Không gian", giảm
  // padding/gap. Nếu vẫn chưa đủ chỗ, `overflowX:auto` trên chính <nav> là
  // lưới an toàn cuối — cuộn ngang MỘT THANH NAV nhỏ, không phải cả trang.
  const isCompact = useIsCompact(640);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: APP_TOP_BAR_H, zIndex: 50,
      background: T.panel, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: isCompact ? '0 14px' : '0 28px',
      gap: isCompact ? 14 : 28,
    }}>
      <a href="/vibe-demo/home" style={{
        fontFamily: T.sans, fontSize: 17, fontWeight: 700, color: T.ink,
        letterSpacing: '-0.01em', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <span style={{ color: T.accent }}>✒</span> {!isCompact && 'Spaces'}
      </a>
      <nav style={{
        display: 'flex', gap: isCompact ? 14 : 22, minWidth: 0,
        overflowX: isCompact ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch',
      }}>
        {NAV_ITEMS.map(it => (
          <a key={it.key} href={it.href} className="vd-focusable" style={{
            fontFamily: T.sans, fontSize: 14, fontWeight: it.key === active ? 600 : 450,
            color: it.key === active ? T.ink : T.inkMuted,
            textDecoration: 'none', padding: '4px 0', whiteSpace: 'nowrap', flexShrink: 0,
            borderBottom: `2px solid ${it.key === active ? T.accent : 'transparent'}`,
          }}>
            {isCompact && it.shortLabel ? it.shortLabel : it.label}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: T.accent, color: T.onAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.sans, fontSize: 12.5, fontWeight: 700,
        }}>
          TH
        </div>
      </div>
    </div>
  );
}
