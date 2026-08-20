'use client';

import React, { useState } from 'react';
import { ChevronRight, Play, ArrowRight, Target } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

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

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const T = {
  page:    '#FAFAF7',
  room:    '#1A1C22',
  panel:   '#FFFFFF',
  ink:     '#212633',
  inkMid:  'rgba(33,38,51,0.72)',
  inkMuted:'rgba(33,38,51,0.50)',
  inkDim:  'rgba(33,38,51,0.28)',
  border:  'rgba(33,38,51,0.10)',
  borderHi:'rgba(33,38,51,0.20)',
  accent:  '#2E4A9E',
  accentA: 'rgba(46,74,158,0.08)',
  marginLn:'rgba(46,74,158,0.30)',
  onAccent:'#FFFFFF',
  accentScreen: '#8FA6EE',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

const TOP_BAR_H = 56;
const R = { sm: 6, md: 12, lg: 16 };

function useIsCompact(breakpointPx: number): boolean {
  const [isCompact, setIsCompact] = useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);
  return isCompact;
}

/* ─── Shared top nav — dùng chung cho các trang cấp ứng dụng
   (Trang chủ / Giới thiệu / Không gian của tôi), khác với breadcrumb
   trong các trang học. ─── */
function TopNav({ active }: { active: 'home' | 'spaces' | 'about' }) {
  const T_ = T;
  const items: { key: typeof active; label: string; href: string }[] = [
    { key: 'home',   label: 'Trang chủ',        href: '/vibe-demo/home' },
    { key: 'spaces', label: 'Không gian của tôi', href: '/vibe-demo/spaces' },
    { key: 'about',  label: 'Giới thiệu',        href: '/vibe-demo/about' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H, zIndex: 50,
      background: T_.panel, borderBottom: `1px solid ${T_.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 28,
    }}>
      <a href="/vibe-demo/home" style={{
        fontFamily: T_.sans, fontSize: 17, fontWeight: 700, color: T_.ink,
        letterSpacing: '-0.01em', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: T_.accent }}>✒</span> Spaces
      </a>
      <nav style={{ display: 'flex', gap: 22 }}>
        {items.map(it => (
          <a key={it.key} href={it.href} className="vd-focusable" style={{
            fontFamily: T_.sans, fontSize: 14, fontWeight: it.key === active ? 600 : 450,
            color: it.key === active ? T_.ink : T_.inkMuted,
            textDecoration: 'none', padding: '4px 0',
            borderBottom: `2px solid ${it.key === active ? T_.accent : 'transparent'}`,
          }}>
            {it.label}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: T_.accent, color: T_.onAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T_.sans, fontSize: 12.5, fontWeight: 700,
        }}>
          TH
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeHomeDemoPage() {
  const isCompact = useIsCompact(900);
  const inkCount = INK_DAYS.filter(Boolean).length;

  return (
    <>
      <style>{`
        .vd-focusable:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>

      <TopNav active="home" />

      <div style={{
        position: 'fixed', top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        background: T.page, overflowY: 'auto', display: 'flex', justifyContent: 'center',
      }} className="cs-scrollbar">
        <div style={{
          width: '100%', maxWidth: 1180,
          padding: isCompact ? '28px 16px 56px' : '40px 32px 64px',
        }}>
          {/* ── Lời chào ── */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{
              fontFamily: T.sans, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700,
              letterSpacing: '-0.015em', color: T.ink, margin: 0,
            }}>
              Chào buổi tối, Thái
            </h1>
            <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.inkDim }}>
              Thứ Tư, 19 tháng 8
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : '1fr 320px',
            gap: isCompact ? 24 : 32,
          }}>
            {/* ══ CỘT TRÁI: trang sổ đang mở ══ */}
            <div>
              {/* Thẻ "Đang học" — dải bookmark ở góc thay cho nhãn "tiếp tục" thường gặp */}
              <div style={{
                position: 'relative',
                display: 'flex', flexDirection: isCompact ? 'column' : 'row',
                background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.lg,
                boxShadow: T.shadowMd, overflow: 'hidden',
              }}>
                {/* Dải bookmark — nhô ra góc trên phải như dấu trang thật */}
                <div style={{
                  position: 'absolute', top: 0, right: 28,
                  width: 30, height: 44,
                  background: T.accent,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  paddingTop: 8, zIndex: 2,
                }}>
                  <span style={{ fontFamily: T.mono, fontSize: 9.5, fontWeight: 700, color: T.onAccent }}>
                    38%
                  </span>
                </div>

                <div style={{
                  flex: isCompact ? undefined : '0 0 42%',
                  aspectRatio: isCompact ? '16/9' : undefined,
                  minHeight: isCompact ? undefined : 220,
                  background: T.room,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <button aria-label="Tiếp tục học" className="vd-focusable" style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(244,246,252,0.12)', border: `1.5px solid ${T.accentScreen}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <Play size={18} style={{ color: T.accentScreen, marginLeft: 2 }} fill={T.accentScreen} />
                  </button>
                  <span style={{
                    position: 'absolute', bottom: 12, left: 14,
                    fontFamily: T.mono, fontSize: 11, color: 'rgba(244,246,252,0.55)',
                  }}>
                    còn 12 phút
                  </span>
                </div>

                <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: T.inkMuted, marginBottom: 6 }}>
                    Đang học · Nền tảng React 18
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 700, color: T.ink, lineHeight: 1.35 }}>
                    App Router, JSX &amp; Component Model
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.inkMuted, marginTop: 8, lineHeight: 1.6 }}>
                    Lập trình web hiện đại — chương 1/3, bài 2/8
                  </div>
                  <a href="/vibe-demo" className="vd-focusable" style={{
                    marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.accent,
                    textDecoration: 'none', paddingTop: 16,
                  }}>
                    Tiếp tục học <ArrowRight size={15} />
                  </a>
                </div>
              </div>

              {/* ── Không gian của bạn — xem trước 3 dòng, dẫn sang trang danh sách ── */}
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.ink, margin: 0 }}>
                    Không gian của bạn
                  </h2>
                  <a href="/vibe-demo/spaces" className="vd-focusable" style={{
                    fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.accent, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    Xem tất cả <ChevronRight size={13} />
                  </a>
                </div>

                <div style={{
                  background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
                  boxShadow: T.shadowSm, overflow: 'hidden',
                }}>
                  {SPACES.map((s, i) => (
                    <a key={s.id} href="/vibe-demo/spaces" className="vd-focusable" style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      borderBottom: i < SPACES.length - 1 ? `1px solid ${T.border}` : 'none',
                      textDecoration: 'none', color: 'inherit',
                    }}>
                      <span style={{ width: 5, height: 34, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: T.ink }}>
                          {s.title}
                        </div>
                        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, marginTop: 2 }}>
                          {s.chapters} chương
                        </div>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, color: T.accent, flexShrink: 0 }}>
                        {s.pct}%
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ CỘT PHẢI: lịch mực + mục tiêu ══ */}
            {!isCompact && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Lịch mực 7 ngày — thay cho biểu tượng streak lửa thường gặp */}
                <div style={{
                  background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
                  boxShadow: T.shadowSm, padding: 18,
                }}>
                  <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    Tuần này
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.inkMuted, marginBottom: 14 }}>
                    {inkCount}/7 ngày có nét mực mới
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {WEEK.map((d, i) => (
                      <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: '100%', aspectRatio: '1', borderRadius: R.sm,
                          background: INK_DAYS[i] ? T.accent : T.accentA,
                          border: `1px solid ${INK_DAYS[i] ? T.accent : T.border}`,
                        }} />
                        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkDim }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mục tiêu tuần */}
                <div style={{
                  background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
                  boxShadow: T.shadowSm, padding: 18,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Target size={14} style={{ color: T.accent }} />
                    <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>
                      Mục tiêu tuần
                    </span>
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>
                    3<span style={{ color: T.inkDim, fontWeight: 400 }}>/5 bài</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(33,38,51,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ width: '60%', height: '100%', background: T.accent }} />
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.inkMuted, marginTop: 10, lineHeight: 1.55 }}>
                    Còn 2 bài nữa để hoàn thành mục tiêu tuần này.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
