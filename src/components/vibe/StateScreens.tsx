'use client';

// Mục 4 — "trạng thái người dùng thật": bộ 4 trạng thái toàn màn hình mà
// ngôn ngữ thiết kế "Mực xanh trên giấy trắng" chưa từng vẽ, vì mọi trang
// vibe-demo trước giờ giả định người dùng LUÔN đã đăng nhập, LUÔN có quyền,
// và LUÔN có credit. Một component dùng chung — không phải 4 file riêng —
// vì cả 4 trường hợp cùng một hình chữ: một "tờ giấy" giữa trang trắng,
// biểu tượng + tiêu đề + câu giải thích + hành động, chỉ khác nội dung.
import React from 'react';
import { LucideIcon, LogIn, TimerOff, ShieldOff, Lock } from 'lucide-react';
import { T, R } from '@/lib/vibe/theme';

interface StateScreenAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

export interface StateScreenProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  message: string;
  actions: StateScreenAction[];
}

// Khối dùng chung — full-viewport, căn giữa, một "tờ giấy" duy nhất. Không
// dùng TopNav (nếu chưa đăng nhập/hết quyền thì nav "Không gian của tôi"
// cũng vô nghĩa để hiện) — đây là lý do các trạng thái này KHÔNG lồng trong
// layout app-level, mà là một trang độc lập của riêng chúng.
export function StateScreen({ icon: Icon, eyebrow, title, message, actions }: StateScreenProps) {
  return (
    <div className="min-h-screen bg-ink-page flex items-center justify-center px-6">
      <div
        className="w-full max-w-[440px] bg-ink-panel border border-ink-border py-10 px-8 text-center"
        style={{ borderRadius: R.md, boxShadow: T.shadowSm }}
      >
        <div
          className="w-11 h-11 mx-auto mb-5 flex items-center justify-center"
          style={{ background: T.accentA, borderRadius: R.sm }}
        >
          <Icon size={20} className="text-ink-accent" />
        </div>
        <div className="text-[12.5px] font-semibold text-ink-textMuted tracking-[0.02em] uppercase mb-1.5">
          {eyebrow}
        </div>
        <h1 className="text-lg font-bold text-ink-text tracking-[-0.01em] m-0">{title}</h1>
        <p className="text-[14px] text-ink-textMid leading-[1.6] mt-2.5">{message}</p>

        <div className="flex flex-col gap-2.5 mt-7">
          {actions.map((a, i) => {
            const cls = a.primary
              ? 'vd-focusable inline-flex items-center justify-center py-2.5 px-5 bg-ink-accent text-ink-onAccent border-none cursor-pointer text-sm font-semibold'
              : 'vd-focusable inline-flex items-center justify-center py-2.5 px-5 bg-transparent text-ink-textMid border border-ink-borderHi cursor-pointer text-sm font-medium';
            return a.href ? (
              <a key={i} href={a.href} className={cls} style={{ borderRadius: R.sm, textDecoration: 'none' }}>
                {a.label}
              </a>
            ) : (
              <button key={i} onClick={a.onClick} className={cls} style={{ borderRadius: R.sm }}>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 3 trạng thái auth cụ thể (mục 4, bullet 1) ─────────────────────────────

export function NotLoggedInScreen({ continueUrl }: { continueUrl: string }) {
  return (
    <StateScreen
      icon={LogIn}
      eyebrow="Cần đăng nhập"
      title="Bạn chưa đăng nhập"
      message="Đăng nhập để mở không gian học của bạn — tiến độ, ghi chú và kết quả quiz đều gắn với tài khoản, không lưu ẩn danh."
      actions={[
        { label: 'Đăng nhập', href: `/login?continueUrl=${encodeURIComponent(continueUrl)}`, primary: true },
        { label: 'Về trang chủ', href: '/vibe-demo/home' },
      ]}
    />
  );
}

export function SessionExpiredScreen({ continueUrl }: { continueUrl: string }) {
  return (
    <StateScreen
      icon={TimerOff}
      eyebrow="Hết hạn phiên"
      title="Phiên đăng nhập đã hết hạn"
      message="Vì lý do an toàn, bạn cần đăng nhập lại. Nếu đang làm quiz, câu trả lời đã lưu tại máy — đăng nhập lại để tiếp tục đúng chỗ đã dừng."
      actions={[
        { label: 'Đăng nhập lại', href: `/login?continueUrl=${encodeURIComponent(continueUrl)}`, primary: true },
      ]}
    />
  );
}

export function NoAccessScreen({ spaceTitle }: { spaceTitle: string }) {
  return (
    <StateScreen
      icon={ShieldOff}
      eyebrow="Không có quyền truy cập"
      title="Bạn chưa có quyền vào không gian này"
      message={`"${spaceTitle}" không thuộc tài khoản của bạn, hoặc chủ không gian chưa chia sẻ cho bạn. Liên hệ chủ không gian để được thêm vào.`}
      actions={[
        { label: 'Về danh sách không gian của tôi', href: '/vibe-demo/spaces', primary: true },
      ]}
    />
  );
}

// ── Billing/paywall (mục 4, bullet 3) ──────────────────────────────────────

export function PaywalledSpaceScreen({ spaceTitle }: { spaceTitle: string }) {
  return (
    <StateScreen
      icon={Lock}
      eyebrow="Không gian đã bị khóa"
      title="Hết credit cho không gian này"
      message={`"${spaceTitle}" dùng AI để tạo tóm tắt/quiz tuỳ biến — phần đó đã dùng hết credit miễn phí. Nội dung đã học vẫn còn, chỉ tính năng AI tạo mới bị tạm khóa.`}
      actions={[
        { label: 'Mua thêm credit', href: '/billing', primary: true },
        { label: 'Về danh sách không gian của tôi', href: '/vibe-demo/spaces' },
      ]}
    />
  );
}
