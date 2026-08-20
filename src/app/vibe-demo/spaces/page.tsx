'use client';

import React, { useState } from 'react';
import { ChevronRight, Plus, Archive, BookOpenCheck } from 'lucide-react';
import { T, R, MARGIN_W, APP_TOP_BAR_H, useIsCompact, VIBE_GLOBAL_CSS, beVietnam } from '@/lib/vibe/theme';
import { TopNav } from '@/components/vibe/TopNav';

/* ─── Data ──────────────────────────────────────────────────────────────── */
type SpaceStatus = 'active' | 'done' | 'archived';

interface Space {
  id: string; title: string; desc: string; chapters: number; pct: number;
  color: string; lastOpened: string; status: SpaceStatus;
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
];

type Tab = 'active' | 'done' | 'archived';
const TABS: { key: Tab; label: string }[] = [
  { key: 'active',   label: 'Đang học' },
  { key: 'done',     label: 'Hoàn thành' },
  { key: 'archived', label: 'Lưu trữ' },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeSpacesDemoPage() {
  const [tab, setTab] = useState<Tab>('active');
  const isCompact = useIsCompact(760);

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

            {filtered.map((s, i) => (
              <a
                key={s.id}
                href={s.status === 'active' ? '/vibe-demo' : undefined}
                className={`vd-shelf-row vd-focusable flex items-stretch no-underline text-inherit ${
                  i < filtered.length - 1 ? 'border-b border-ink-border' : 'border-b-0'
                } ${s.status === 'active' ? 'cursor-pointer' : 'cursor-default'}`}
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
                    {s.status === 'done' ? (
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
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
