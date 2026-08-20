'use client';

import React, { useState } from 'react';
import { ChevronRight, Plus, Archive, BookOpenCheck } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

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

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const T = {
  page:    '#FAFAF7',
  panel:   '#FFFFFF',
  ink:     '#212633',
  inkMid:  'rgba(33,38,51,0.72)',
  inkMuted:'rgba(33,38,51,0.50)',
  inkDim:  'rgba(33,38,51,0.28)',
  border:  'rgba(33,38,51,0.10)',
  borderHi:'rgba(33,38,51,0.20)',
  accent:  '#2E4A9E',
  accentA: 'rgba(46,74,158,0.08)',
  onAccent:'#FFFFFF',
  pencilLn:'rgba(33,38,51,0.30)',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

const TOP_BAR_H = 56;
const R = { sm: 6, md: 12, lg: 16 };
const MARGIN_W = 56;

type Tab = 'active' | 'done' | 'archived';
const TABS: { key: Tab; label: string }[] = [
  { key: 'active',   label: 'Đang học' },
  { key: 'done',     label: 'Hoàn thành' },
  { key: 'archived', label: 'Lưu trữ' },
];

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

function TopNav({ active }: { active: 'home' | 'spaces' | 'about' }) {
  const items: { key: typeof active; label: string; href: string }[] = [
    { key: 'home',   label: 'Trang chủ',          href: '/vibe-demo/home' },
    { key: 'spaces', label: 'Không gian của tôi', href: '/vibe-demo/spaces' },
    { key: 'about',  label: 'Giới thiệu',          href: '/vibe-demo/about' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H, zIndex: 50,
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
        {items.map(it => (
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
    <>
      <style>{`
        .vd-focusable:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 4px;
        }
        .vd-shelf-row { transition: background 120ms; }
        .vd-shelf-row:hover { background: rgba(33,38,51,0.025); }
      `}</style>

      <TopNav active="spaces" />

      <div style={{
        position: 'fixed', top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        background: T.page, overflowY: 'auto', display: 'flex', justifyContent: 'center',
      }} className="cs-scrollbar">
        <div style={{
          width: '100%', maxWidth: 900,
          padding: isCompact ? '28px 16px 56px' : '40px 32px 64px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontFamily: T.sans, fontSize: 'clamp(22px, 2.6vw, 28px)', fontWeight: 700,
                letterSpacing: '-0.015em', color: T.ink, margin: 0,
              }}>
                Không gian của tôi
              </h1>
              <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.inkMuted, margin: '6px 0 0' }}>
                {SPACES.length} không gian — sắp trên giá theo màu gáy riêng của từng cuốn.
              </p>
            </div>
            <button className="vd-focusable" style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              padding: '10px 18px',
              background: T.accent, color: T.onAccent,
              border: 'none', borderRadius: R.sm, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 14, fontWeight: 600,
            }}>
              <Plus size={15} />
              Tạo không gian mới
            </button>
          </div>

          {/* Tab lọc — mỗi tab là một ngăn của giá sách */}
          <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="vd-focusable"
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 6,
                    padding: '10px 6px', marginBottom: -1,
                    background: 'none', cursor: 'pointer',
                    border: 'none', borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
                    fontFamily: T.sans, fontSize: 14, fontWeight: isActive ? 600 : 450,
                    color: isActive ? T.ink : T.inkMuted,
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: isActive ? T.accent : T.inkDim }}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Giá sách ── */}
          <div style={{
            background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
            boxShadow: T.shadowSm, overflow: 'hidden', marginTop: 12,
          }}>
            {filtered.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span style={{ width: MARGIN_W, flexShrink: 0 }} />
                <div style={{
                  flex: 1, padding: '20px 16px',
                  fontFamily: T.sans, fontSize: 14, color: T.inkDim,
                }}>
                  Ngăn này chưa có không gian nào.
                </div>
              </div>
            )}

            {filtered.map((s, i) => (
              <a
                key={s.id}
                href={s.status === 'active' ? '/vibe-demo' : undefined}
                className="vd-shelf-row vd-focusable"
                style={{
                  display: 'flex', alignItems: 'stretch',
                  textDecoration: 'none', color: 'inherit',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                  cursor: s.status === 'active' ? 'pointer' : 'default',
                }}
              >
                <span style={{
                  width: MARGIN_W, flexShrink: 0,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  paddingTop: 15,
                  fontFamily: T.mono, fontSize: 11, color: T.inkDim,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Gáy sách màu — nhận diện không gian bằng màu trước khi đọc tên */}
                <span style={{ width: 5, alignSelf: 'stretch', background: s.color, margin: '10px 0', borderRadius: 2, flexShrink: 0 }} />

                <div style={{
                  flex: 1, minWidth: 0,
                  padding: '14px 16px 14px 16px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: isCompact ? 'wrap' : 'nowrap',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.sans, fontSize: 15.5, fontWeight: 650, color: T.ink,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontFamily: T.sans, fontSize: 13, color: T.inkMuted, marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.desc}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim }}>{s.chapters} chương</span>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim }}>{s.lastOpened}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {s.status === 'done' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.accent, fontFamily: T.sans, fontSize: 12.5, fontWeight: 600 }}>
                        <BookOpenCheck size={14} /> Hoàn thành
                      </span>
                    ) : s.status === 'archived' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.inkDim, fontFamily: T.sans, fontSize: 12.5, fontWeight: 500 }}>
                        <Archive size={14} /> Lưu trữ
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 120 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(33,38,51,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: s.color }} />
                        </div>
                        <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.inkMid, width: 30, textAlign: 'right' }}>
                          {s.pct}%
                        </span>
                      </div>
                    )}
                    <ChevronRight size={15} style={{ color: T.inkDim, flexShrink: 0 }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
