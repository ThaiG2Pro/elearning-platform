'use client';

import React from 'react';
import { ChevronRight, Play, ArrowRight, Target } from 'lucide-react';
import { beVietnam, R, APP_TOP_BAR_H, useIsCompact, VIBE_GLOBAL_CSS } from '@/lib/vibe/theme';
import { TopNav } from '@/components/vibe/TopNav';

/* ─── Data ──────────────────────────────────────────────────────────────── */
interface SpacePreview {
  id: string; title: string; chapters: number; pct: number; color: string;
}
const SPACES: SpacePreview[] = [
  { id: 's1', title: 'Lập trình web hiện đại',   chapters: 8, pct: 38, color: '#2E4A9E' },
  { id: 's2', title: 'Tư duy hệ thống & Kiến trúc', chapters: 5, pct: 71, color: '#7A5C2E' },
  { id: 's3', title: 'Thiết kế UI cho lập trình viên', chapters: 6, pct: 12, color: '#2E7A5C' },
];

// Lịch mực 7 ngày — mỗi ô là một ngày, đặc = có học, nhạt = không.
// Thay cho biểu tượng lửa streak thường gặp: nét mực đều đặn nói đúng
// hơn về một thói quen học tập "gọn gàng", không phải một chuỗi cần giữ.
const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const INK_DAYS = [true, true, false, true, true, true, false];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeHomeDemoPage() {
  const isCompact = useIsCompact(900);
  const inkCount = INK_DAYS.filter(Boolean).length;

  return (
    <div className={beVietnam.className}>
      <style>{VIBE_GLOBAL_CSS}</style>

      <TopNav active="home" />

      <div
        style={{ top: APP_TOP_BAR_H }}
        className="fixed left-0 right-0 bottom-0 bg-ink-page overflow-y-auto flex justify-center cs-scrollbar"
      >
        <div
          className="w-full max-w-[1180px]"
          style={{ padding: isCompact ? '28px 16px 56px' : '40px 32px 64px' }}
        >
          {/* ── Lời chào ── */}
          {/* Verified: user display name can be arbitrarily long in real data. This row
              already wraps (flex-wrap + items-baseline) instead of squishing the date,
              which is the graceful outcome — no truncate/title added here since cutting
              off a user's own name reads worse than letting the greeting wrap. */}
          <div className="flex items-baseline justify-between mb-7 flex-wrap gap-2">
            <h1 className="text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.015em] text-ink-text m-0 min-w-0">
              Chào buổi tối, Thái
            </h1>
            <span className="font-mono text-[12.5px] text-ink-textDim shrink-0">
              Thứ Tư, 19 tháng 8
            </span>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: isCompact ? '1fr' : '1fr 320px',
              gap: isCompact ? 24 : 32,
            }}
          >
            {/* ══ CỘT TRÁI: trang sổ đang mở ══ */}
            <div>
              {/* Thẻ "Đang học" — dải bookmark ở góc thay cho nhãn "tiếp tục" thường gặp */}
              <div
                className={`relative flex ${isCompact ? 'flex-col' : 'flex-row'} bg-ink-panel border border-ink-border overflow-hidden`}
                style={{ borderRadius: R.lg, boxShadow: '0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)' }}
              >
                {/* Dải bookmark — nhô ra góc trên phải như dấu trang thật.
                    Width left as fixed w-[30px] (not min-w): the clipPath below draws
                    the ribbon's pointed tip as percentages of this element's own box,
                    so a variable width would distort the bookmark shape. "100%" (3
                    digits) still fits at 9.5px font-mono in 30px, so this is fine. */}
                <div
                  className="absolute top-0 right-7 w-[30px] h-11 bg-ink-accent flex items-start justify-center pt-2 z-[2]"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                >
                  <span className="font-mono text-[9.5px] font-bold text-ink-onAccent">
                    38%
                  </span>
                </div>

                <div
                  className="flex items-center justify-center relative bg-ink-room"
                  style={{
                    flex: isCompact ? undefined : '0 0 42%',
                    aspectRatio: isCompact ? '16/9' : undefined,
                    minHeight: isCompact ? undefined : 220,
                  }}
                >
                  <button
                    aria-label="Tiếp tục học"
                    className="vd-focusable w-[52px] h-[52px] rounded-full border-[1.5px] border-ink-accentScreen flex items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(244,246,252,0.12)' }}
                  >
                    <Play size={18} className="text-ink-accentScreen ml-0.5" fill="currentColor" />
                  </button>
                  <span
                    className="absolute bottom-3 left-3.5 font-mono text-[11px]"
                    style={{ color: 'rgba(244,246,252,0.55)' }}
                  >
                    còn 12 phút
                  </span>
                </div>

                <div className="flex-1 px-[26px] py-[22px] flex flex-col min-w-0">
                  <div
                    title="Đang học · Nền tảng React 18"
                    className="text-[12.5px] font-medium text-ink-textMuted mb-1.5 truncate"
                  >
                    Đang học · Nền tảng React 18
                  </div>
                  <div
                    title="App Router, JSX & Component Model"
                    className="text-xl font-bold text-ink-text leading-[1.35] line-clamp-2"
                  >
                    App Router, JSX &amp; Component Model
                  </div>
                  <div
                    title="Lập trình web hiện đại — chương 1/3, bài 2/8"
                    className="text-[13.5px] text-ink-textMuted mt-2 leading-[1.6] line-clamp-2"
                  >
                    Lập trình web hiện đại — chương 1/3, bài 2/8
                  </div>
                  <a
                    href="/vibe-demo"
                    className="vd-focusable mt-auto inline-flex items-center gap-2 text-sm font-semibold text-ink-accent no-underline pt-4"
                  >
                    Tiếp tục học <ArrowRight size={15} />
                  </a>
                </div>
              </div>

              {/* ── Không gian của bạn — xem trước 3 dòng, dẫn sang trang danh sách ── */}
              <div className="mt-8">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-base font-bold text-ink-text m-0">
                    Không gian của bạn
                  </h2>
                  <a
                    href="/vibe-demo/spaces"
                    className="vd-focusable text-[13px] font-medium text-ink-accent no-underline flex items-center gap-1"
                  >
                    Xem tất cả <ChevronRight size={13} />
                  </a>
                </div>

                <div
                  className="bg-ink-panel border border-ink-border overflow-hidden"
                  style={{ borderRadius: R.md, boxShadow: '0 1px 2px rgba(33,38,51,0.04)' }}
                >
                  {/* Verified: no fixed height here — with 50+ SPACES this panel just
                      grows taller and relies on the page's own overflow-y-auto scroll
                      container (see the fixed-topbar wrapper above), same pattern as
                      sibling vibe-demo pages. `overflow-hidden` above only clips the
                      panel's own rounded corners/border, not row content. */}
                  {SPACES.map((s, i) => (
                    <a
                      key={s.id}
                      href="/vibe-demo/spaces"
                      className={`vd-focusable flex items-center gap-3.5 px-[18px] py-3.5 no-underline text-inherit ${i < SPACES.length - 1 ? 'border-b border-ink-border' : ''}`}
                    >
                      <span
                        className="w-[5px] h-[34px] rounded-sm shrink-0"
                        style={{ background: s.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div title={s.title} className="text-[14.5px] font-semibold text-ink-text truncate">
                          {s.title}
                        </div>
                        <div className="font-mono text-[11px] text-ink-textDim mt-0.5">
                          {s.chapters} chương
                        </div>
                      </div>
                      <span className="font-mono text-[12.5px] font-semibold text-ink-accent shrink-0 text-right min-w-[34px]">
                        {s.pct}%
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ CỘT PHẢI: lịch mực + mục tiêu ══ */}
            {!isCompact && (
              <div className="flex flex-col gap-5">
                {/* Lịch mực 7 ngày — thay cho biểu tượng streak lửa thường gặp */}
                <div
                  className="bg-ink-panel border border-ink-border p-[18px]"
                  style={{ borderRadius: R.md, boxShadow: '0 1px 2px rgba(33,38,51,0.04)' }}
                >
                  <div className="text-[13px] font-semibold text-ink-text mb-1">
                    Tuần này
                  </div>
                  <div className="text-[12.5px] text-ink-textMuted mb-3.5">
                    {inkCount}/7 ngày có nét mực mới
                  </div>
                  <div className="flex gap-2">
                    {WEEK.map((d, i) => (
                      <div key={d} className="flex-1 flex flex-col items-center gap-1.5">
                        <div
                          className={`w-full aspect-square border ${INK_DAYS[i] ? 'bg-ink-accent border-ink-accent' : 'bg-ink-accentA border-ink-border'}`}
                          style={{ borderRadius: R.sm }}
                        />
                        <span className="font-mono text-[10px] text-ink-textDim">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mục tiêu tuần */}
                <div
                  className="bg-ink-panel border border-ink-border p-[18px]"
                  style={{ borderRadius: R.md, boxShadow: '0 1px 2px rgba(33,38,51,0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} className="text-ink-accent" />
                    <span className="text-[13px] font-semibold text-ink-text">
                      Mục tiêu tuần
                    </span>
                  </div>
                  <div className="text-[22px] font-bold text-ink-text tracking-[-0.01em]">
                    3<span className="text-ink-textDim font-normal">/5 bài</span>
                  </div>
                  <div
                    className="h-1 rounded-sm overflow-hidden mt-2.5"
                    style={{ background: 'rgba(33,38,51,0.08)' }}
                  >
                    <div className="w-[60%] h-full bg-ink-accent" />
                  </div>
                  <div className="text-[12.5px] text-ink-textMuted mt-2.5 leading-[1.55]">
                    Còn 2 bài nữa để hoàn thành mục tiêu tuần này.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
