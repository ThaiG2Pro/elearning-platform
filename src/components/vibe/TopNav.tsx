'use client';

// TopNav dùng chung cho các trang app-level (home/about/spaces) — khác với
// breadcrumb top-bar của trang lesson (video/quiz/article), vì hai ngữ cảnh
// điều hướng (duyệt app vs. đang trong 1 bài học) cần phân biệt được bằng
// mắt dù dùng chung token/panel/border/accent. Trước đây bị định nghĩa lại
// giống hệt nhau ở cả 3 file home/about/spaces.
import React from 'react';
import { T, APP_TOP_BAR_H } from '@/lib/vibe/theme';

export type TopNavKey = 'home' | 'spaces' | 'about';

const NAV_ITEMS: { key: TopNavKey; label: string; href: string }[] = [
  { key: 'home',   label: 'Trang chủ',          href: '/vibe-demo/home' },
  { key: 'spaces', label: 'Không gian của tôi', href: '/vibe-demo/spaces' },
  { key: 'about',  label: 'Giới thiệu',          href: '/vibe-demo/about' },
];

export function TopNav({ active }: { active: TopNavKey }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: APP_TOP_BAR_H, zIndex: 50,
      background: T.panel, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 28,
    }}>
      <a href="/vibe-demo/home" style={{
        fontFamily: T.sans, fontSize: 17, fontWeight: 700, color: T.ink,
        letterSpacing: '-0.01em', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: T.accent }}>✒</span> Spaces
      </a>
      <nav style={{ display: 'flex', gap: 22 }}>
        {NAV_ITEMS.map(it => (
          <a key={it.key} href={it.href} className="vd-focusable" style={{
            fontFamily: T.sans, fontSize: 14, fontWeight: it.key === active ? 600 : 450,
            color: it.key === active ? T.ink : T.inkMuted,
            textDecoration: 'none', padding: '4px 0',
            borderBottom: `2px solid ${it.key === active ? T.accent : 'transparent'}`,
          }}>
            {it.label}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
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
