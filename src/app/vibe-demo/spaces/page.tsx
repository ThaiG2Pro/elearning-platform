'use client';

import React, { useState } from 'react';
import { ChevronRight, Plus, Archive, BookOpenCheck, ShieldOff, Lock, X } from 'lucide-react';
import { T, R, MARGIN_W, APP_TOP_BAR_H, useIsCompact, VIBE_GLOBAL_CSS, beVietnam } from '@/lib/vibe/theme';
import { TopNav } from '@/components/vibe/TopNav';
import { NotLoggedInScreen, SessionExpiredScreen, NoAccessScreen, PaywalledSpaceScreen } from '@/components/vibe/StateScreens';

/* ─── Data ──────────────────────────────────────────────────────────────── */
type SpaceStatus = 'active' | 'done' | 'archived';

// Mục 4 — hai trạng thái mà một không gian THẬT có thể rơi vào ngoài
// active/done/archived: không có quyền vào (chủ chưa chia sẻ) và bị khóa vì
// hết credit AI (billing). Optional vì chỉ 2 trong 6 space demo minh hoạ.
type SpaceLock = 'no_access' | 'paywall';

interface Space {
  id: string; title: string; desc: string; chapters: number; pct: number;
  color: string; lastOpened: string; status: SpaceStatus; locked?: SpaceLock;
}

// "Gáy sách" — mỗi không gian mang một màu riêng, như gáy một cuốn sổ trên
// giá sách. Màu không trang trí: nó là cách nhận ra không gian của mình
// trong nháy mắt, giống cách người ta tìm sách bằng màu gáy trước khi đọc tên.
const SPACES: Space[] = [
  { id: 's1', title: 'Lập trình web hiện đại', desc: 'React 18, App Router, Hooks & Server Components',
    chapters: 8, pct: 38, color: '#2E4A9E', lastOpened: 'Hôm nay, 21:40', status: 'active' },
  { id: 's2', title: 'Tư duy hệ thống & Kiến trúc', desc: 'Thiết kế hệ thống phân tán ở quy mô vừa',
    chapters: 5, pct: 71, color: '#7A5C2E', lastOpened: 'Hôm qua', status: 'active' },
  { id: 's3', title: 'Thiết kế UI cho lập trình viên', desc: 'Type, màu, layout — không cần là designer',
    chapters: 6, pct: 12, color: '#2E7A5C', lastOpened: '3 ngày trước', status: 'active' },
  { id: 's4', title: 'SQL nâng cao cho backend', desc: 'Index, transaction, tối ưu truy vấn thực chiến',
    chapters: 7, pct: 100, color: '#6E2E5C', lastOpened: '2 tuần trước', status: 'done' },
  { id: 's5', title: 'Nhập môn Rust', desc: 'Ownership, borrowing và vì sao compiler khó tính vậy',
    chapters: 9, pct: 100, color: '#8A4A2E', lastOpened: '1 tháng trước', status: 'done' },
  { id: 's6', title: 'Thử nghiệm: Học máy cơ bản', desc: 'Dừng lại giữa chương 2 — chưa quay lại',
    chapters: 4, pct: 22, color: '#4A4A52', lastOpened: '2 tháng trước', status: 'archived' },
  { id: 's7', title: 'Không gian nhóm: Kiến trúc backend', desc: 'Chia sẻ bởi đồng nghiệp — chưa được cấp quyền vào',
    chapters: 6, pct: 0, color: '#4A4A52', lastOpened: '5 ngày trước', status: 'active', locked: 'no_access' },
  { id: 's8', title: 'AI tóm tắt: Design Patterns nâng cao', desc: 'Không gian tạo bằng AI — đã dùng hết credit miễn phí',
    chapters: 5, pct: 45, color: '#7A5C2E', lastOpened: 'Hôm nay, 08:15', status: 'active', locked: 'paywall' },
];

type Tab = 'active' | 'done' | 'archived';
const TABS: { key: Tab; label: string }[] = [
  { key: 'active',   label: 'Đang học' },
  { key: 'done',     label: 'Hoàn thành' },
  { key: 'archived', label: 'Lưu trữ' },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
// Trạng thái không gắn với 1 space cụ thể — xem trước bằng nút riêng vì
// trang demo này không có backend auth thật để tự nhiên rơi vào 2 trạng
// thái này (chưa đăng nhập / hết hạn phiên đều xảy ra TRƯỚC khi tới được
// trang có dữ liệu như trang này).
type AuthPreview = 'not_logged_in' | 'session_expired' | null;

export default function VibeSpacesDemoPage() {
  const [tab, setTab] = useState<Tab>('active');
  const isCompact = useIsCompact(760);
  const [authPreview, setAuthPreview] = useState<AuthPreview>(null);
  const [lockedSpace, setLockedSpace] = useState<Space | null>(null);

  if (authPreview === 'not_logged_in') {
    return <NotLoggedInScreen continueUrl="/vibe-demo/spaces" />;
  }
  if (authPreview === 'session_expired') {
    return <SessionExpiredScreen continueUrl="/vibe-demo/spaces" />;
  }
  if (lockedSpace) {
    return (
      <div className="relative">
        <button
          onClick={() => setLockedSpace(null)}
          aria-label="Đóng, quay lại danh sách"
          className="vd-focusable fixed top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-ink-panel border border-ink-border cursor-pointer text-ink-textMid"
          style={{ borderRadius: R.sm, boxShadow: T.shadowSm }}
        >
          <X size={14} />
        </button>
        {lockedSpace.locked === 'no_access'
          ? <NoAccessScreen spaceTitle={lockedSpace.title} />
          : <PaywalledSpaceScreen spaceTitle={lockedSpace.title} />}
      </div>
    );
  }

  const filtered = SPACES.filter(s => s.status === tab);
  const counts: Record<Tab, number> = {
    active:   SPACES.filter(s => s.status === 'active').length,
    done:     SPACES.filter(s => s.status === 'done').length,
    archived: SPACES.filter(s => s.status === 'archived').length,
  };

  return (
    <div className={beVietnam.className}>
      <style>{`
        ${VIBE_GLOBAL_CSS}
        .vd-shelf-row { transition: background 120ms; }
        .vd-shelf-row:hover { background: rgba(33,38,51,0.025); }
      `}</style>

      <TopNav active="spaces" />

      <div
        style={{ top: APP_TOP_BAR_H }}
        className="fixed left-0 right-0 bottom-0 bg-ink-page overflow-y-auto flex justify-center cs-scrollbar"
      >
        <div
          className="w-full max-w-[900px]"
          style={{ padding: isCompact ? '28px 16px 56px' : '40px 32px 64px' }}
        >
          <div className="flex items-start justify-between mb-[22px] gap-3 flex-wrap">
            <div>
              <h1 className="text-[clamp(22px,2.6vw,28px)] font-bold tracking-[-0.015em] text-ink-text m-0">
                Không gian của tôi
              </h1>
              <p className="text-[13.5px] text-ink-textMuted mt-1.5">
                {SPACES.length} không gian — sắp trên giá theo màu gáy riêng của từng cuốn.
              </p>
            </div>
            <button
              className="vd-focusable flex items-center gap-2 shrink-0 px-[18px] py-2.5 bg-ink-accent text-ink-onAccent border-0 cursor-pointer text-sm font-semibold"
              style={{ borderRadius: R.sm }}
            >
              <Plus size={15} />
              Tạo không gian mới
            </button>
          </div>

          {/* Xem trước 2 trạng thái auth không gắn với 1 space cụ thể — chỉ
              để duyệt thiết kế (mục 4), KHÔNG phải điều hướng thật. Trang
              demo không có backend auth nên đây là cách duy nhất để nhìn
              thấy 2 màn này. */}
          <div className="flex items-center gap-2 mb-4 text-[12px] text-ink-textDim">
            <span>Xem trước trạng thái:</span>
            <button onClick={() => setAuthPreview('not_logged_in')} className="vd-focusable underline bg-transparent border-none cursor-pointer text-ink-textDim p-0">
              Chưa đăng nhập
            </button>
            <span>·</span>
            <button onClick={() => setAuthPreview('session_expired')} className="vd-focusable underline bg-transparent border-none cursor-pointer text-ink-textDim p-0">
              Hết hạn phiên
            </button>
          </div>

          {/* Tab lọc — mỗi tab là một ngăn của giá sách */}
          <div className="flex gap-1 border-b border-ink-border mb-1">
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="vd-focusable flex items-baseline gap-1.5 px-1.5 py-2.5 -mb-px bg-transparent cursor-pointer border-0 text-sm"
                  style={{
                    borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
                    fontWeight: isActive ? 600 : 450,
                    color: isActive ? T.ink : T.inkMuted,
                  }}
                >
                  <span>{t.label}</span>
                  <span className="font-mono text-[11px]" style={{ color: isActive ? T.accent : T.inkDim }}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Giá sách ──
              Danh sách không có max-height/overflow riêng: khung cuộn duy nhất
              là div .cs-scrollbar bọc ngoài (page-scroll). Với 50+ mục, giá
              sách chỉ cao thêm và cuộn theo trang — không cần bọc thêm
              max-height + overflow ở đây. */}
          <div
            className="bg-ink-panel border border-ink-border overflow-hidden mt-3"
            style={{ borderRadius: R.md, boxShadow: T.shadowSm }}
          >
            {filtered.length === 0 && (
              <div className="flex items-stretch">
                <span style={{ width: MARGIN_W }} className="shrink-0" />
                <div className="flex-1 py-5 px-4 text-sm text-ink-textDim">
                  Ngăn này chưa có không gian nào.
                </div>
              </div>
            )}

            {filtered.map((s, i) => {
              const clickable = s.status === 'active';
              const rowProps = s.locked
                ? { onClick: () => setLockedSpace(s) }
                : { href: clickable ? '/vibe-demo' : undefined };
              const Tag: any = s.locked ? 'div' : 'a';
              return (
              <Tag
                key={s.id}
                {...rowProps}
                role={s.locked ? 'button' : undefined}
                tabIndex={s.locked ? 0 : undefined}
                onKeyDown={s.locked ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLockedSpace(s); } } : undefined}
                className={`vd-shelf-row vd-focusable flex items-stretch no-underline text-inherit ${
                  i < filtered.length - 1 ? 'border-b border-ink-border' : 'border-b-0'
                } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  style={{ width: MARGIN_W }}
                  className="shrink-0 flex items-start justify-center pt-[15px] font-mono text-[11px] text-ink-textDim"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Gáy sách màu — nhận diện không gian bằng màu trước khi đọc tên */}
                <span
                  className="w-[5px] self-stretch my-2.5 rounded-[2px] shrink-0"
                  style={{ background: s.color }}
                />

                <div
                  className="flex-1 min-w-0 py-3.5 px-4 flex items-center gap-4"
                  style={{ flexWrap: isCompact ? 'wrap' : 'nowrap' }}
                >
                  <div className="flex-1 min-w-0">
                    <div title={s.title} className="text-[15.5px] font-[650] text-ink-text truncate">
                      {s.title}
                    </div>
                    <div title={s.desc} className="text-[13px] text-ink-textMuted mt-[3px] line-clamp-2">
                      {s.desc}
                    </div>
                    <div className="flex gap-[10px] mt-1.5">
                      <span className="font-mono text-[11px] text-ink-textDim shrink-0">{s.chapters} chương</span>
                      <span className="font-mono text-[11px] text-ink-textDim shrink-0">{s.lastOpened}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-[10px] shrink-0">
                    {s.locked === 'no_access' ? (
                      <span className="flex items-center gap-1.5 text-ink-textDim text-[12.5px] font-medium">
                        <ShieldOff size={14} /> Chưa có quyền
                      </span>
                    ) : s.locked === 'paywall' ? (
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: T.wrong }}>
                        <Lock size={14} /> Hết credit
                      </span>
                    ) : s.status === 'done' ? (
                      <span className="flex items-center gap-1.5 text-ink-accent text-[12.5px] font-semibold">
                        <BookOpenCheck size={14} /> Hoàn thành
                      </span>
                    ) : s.status === 'archived' ? (
                      <span className="flex items-center gap-1.5 text-ink-textDim text-[12.5px] font-medium">
                        <Archive size={14} /> Lưu trữ
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 w-[120px]">
                        <div className="flex-1 h-1 bg-[rgba(33,38,51,0.08)] rounded-[2px] overflow-hidden">
                          <div className="h-full" style={{ width: `${s.pct}%`, background: s.color }} />
                        </div>
                        <span className="font-mono text-[11.5px] font-semibold text-ink-textMid min-w-[30px] text-right shrink-0">
                          {s.pct}%
                        </span>
                      </div>
                    )}
                    <ChevronRight size={15} className="text-ink-textDim shrink-0" />
                  </div>
                </div>
              </Tag>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
