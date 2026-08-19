'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, ChevronRight, StickyNote, X, Maximize2, Minimize2, ListVideo } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

// Một giọng chữ duy nhất cho cả trang — Be Vietnam Pro là grotesque được thiết
// kế riêng cho tiếng Việt (dấu đặt chuẩn ở mọi weight), nên "sạch" ngay ở tầng
// chữ: không còn cảnh serif/sans/mono thay phiên nhau đổi "chế độ đọc" của mắt.
const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

/* ─── Data ──────────────────────────────────────────────────────────────── */
type Status = 'completed' | 'in_progress' | 'not_started';

interface Lesson {
  id: string;
  title: string;
  chapter: string;
  duration: string;
  status: Status;
}

const LESSONS: Lesson[] = [
  { id: 'l01', title: 'Virtual DOM & Reconciliation',        chapter: 'Nền tảng React 18',    duration: '14:20',  status: 'completed'   },
  { id: 'l02', title: 'App Router, JSX & Component Model',  chapter: 'Nền tảng React 18',    duration: '22:15',  status: 'completed'   },
  { id: 'l03', title: 'Quiz — Nền tảng React',              chapter: 'Nền tảng React 18',    duration: '10 câu', status: 'completed'   },
  { id: 'l04', title: 'useState & useEffect — Deep Dive',   chapter: 'Hooks & State',        duration: '28:40',  status: 'in_progress' },
  { id: 'l05', title: 'useMemo, useCallback & Performance', chapter: 'Hooks & State',        duration: '35:10',  status: 'not_started' },
  { id: 'l06', title: 'Custom Hooks Pattern',               chapter: 'Hooks & State',        duration: '19:50',  status: 'not_started' },
  { id: 'l07', title: 'TanStack Query & REST API',          chapter: 'Async & Server Comp.', duration: '42:15',  status: 'not_started' },
  { id: 'l08', title: 'Server vs Client Components',        chapter: 'Async & Server Comp.', duration: '31:00',  status: 'not_started' },
];

interface Note { id: string; time: string; text: string; }
const INITIAL_NOTES: Note[] = [
  { id: 'n1', time: '02:15', text: 'Virtual DOM diff — chỉ re-render node thực sự thay đổi' },
  { id: 'n2', time: '08:40', text: 'Rules of Hooks: không dùng trong if / loop / nested fn'  },
  { id: 'n3', time: '14:20', text: 'cleanup() chạy trước effect kế → tránh memory leak'     },
  { id: 'n4', time: '18:05', text: 'useState lazy initializer: truyền fn thay vì giá trị nếu tính toán nặng' },
  { id: 'n5', time: '21:30', text: 'Batching trong React 18: nhiều setState trong async đều được batch' },
];

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
// "Mực xanh trên giấy trắng" — một theme sáng duy nhất. Ý niệm: app là một
// KHÔNG GIAN HỌC TẬP thật, nên nó phải sạch và ngăn nắp như một bàn học vừa
// dọn: nền trắng sứ trung tính (không phải kem ngả vàng — kem đọc ra "cozy",
// trắng sứ đọc ra "gọn gàng"), mực xanh-đen làm chữ, và MỘT accent duy nhất:
// xanh mực bút máy học trò (Cửu Long/Thiên Long) — màu có ký ức học tập của
// người Việt, không phải blue-tech. Ghi chú của user chính là "nét mực".
//
// Dark mode KHÔNG phải một theme: bóng tối là một TRẠNG THÁI. Bấm play, đèn
// phòng dịu xuống quanh video; vào focus mode, phòng tắt đèn hẳn (room) và
// panel ghi chú trắng nổi lên như ngọn đèn bàn. Một căn phòng thật phản ứng
// với việc bạn làm — đó là signature của trang, mọi thứ khác giữ kỷ luật phẳng.
const T = {
  page:    '#FAFAF7', // giấy trắng sứ — trung tính, nhiều khí thở
  pageDim: '#E9E9E4', // đèn phòng dịu xuống khi video đang chạy
  room:    '#1A1C22', // phòng tắt đèn — nền focus mode, KHÔNG phải dark theme
  panel:   '#FFFFFF', // mặt giấy của panel — trắng tuyệt đối, "spotlight" nội dung
  screen:  '#14161C', // màn hình video — luôn tối như thiết bị thật
  ink:     '#212633', // mực xanh-đen (blue-black ink) — chữ chính
  inkMid:  'rgba(33,38,51,0.72)',
  inkMuted:'rgba(33,38,51,0.50)',
  inkDim:  'rgba(33,38,51,0.28)',
  border:  'rgba(33,38,51,0.10)',
  borderHi:'rgba(33,38,51,0.20)',
  accent:  '#2E4A9E', // mực bút máy — accent duy nhất của cả trang
  accentA: 'rgba(46,74,158,0.08)',
  marginLn:'rgba(46,74,158,0.30)', // đường kẻ lề vở — motif cấu trúc chung của playlist & notes
  onAccent:'#FFFFFF',
  // Mực xanh "dưới ánh màn hình" — bản sáng của accent, chỉ dùng cho các
  // element nằm TRÊN nền video tối (progress, trạng thái đã lưu).
  accentScreen: '#8FA6EE',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace", // CHỈ cho timestamp/duration — 11px
} as const;

type PanelTab = 'playlist' | 'notes';

const TOP_BAR_H = 52;
const R = { sm: 6, md: 12, lg: 16 };
// Bề rộng "lề vở" — vùng metadata bên trái đường kẻ lề, dùng chung cho
// playlist (số bài) và notes (timestamp) để hai panel thẳng hàng tuyệt đối.
const MARGIN_W = 56;

// Zoom trình duyệt (Ctrl +/-) THU NHỎ viewport CSS hiệu dụng, không phóng to
// ảnh chụp trang — nên "chống zoom tốt" chính là "responsive theo chiều rộng
// viewport tốt". matchMedia phản ứng đúng với cả zoom lẫn resize cửa sổ thật.
function useIsCompact(breakpointPx: number): boolean {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);
  return isCompact;
}

// Chiều cao video theo TỈ LỆ LIÊN TỤC: video ăn toàn bộ chiều cao viewport
// trừ đi đúng phần bị chiếm thật (topbar + header) và một dải thở CỐ ĐỊNH.
// Nhờ vậy khoảng trống dưới video là hằng số ~BREATH px ở mọi cỡ màn, không
// phình theo màn to (nhược điểm của trần vh hằng số) và không nhảy bậc
// (nhược điểm của tier matchMedia). Chống bug "video tí hon khi zoom cao"
// (viewport CSS bị bóp lùn → phép trừ px ăn quá sâu) bằng SÀN 52vh: video
// không bao giờ thấp hơn nửa viewport.
const HEADER_H = 64; // paddingTop 18 + h1 một dòng ~32 + paddingBottom 14
const BREATH   = 96; // dải thở cố định dưới video
const VIDEO_FLOOR_VH = 52;
// Compact: thay dải thở bằng "phần ló" của panel tab — video chỉ cần chừa
// đủ chỗ cho thanh tab + nửa dòng đầu hiện trên fold để user biết có gì
// bên dưới (cột này cuộn được). Sàn thấp hơn desktop vì màn nhỏ.
const PANEL_PEEK = 110; // margin 16 + tab bar ~45 + nửa dòng playlist ~50
const COMPACT_FLOOR_VH = 38;

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeDemoPage() {
  const [lessons, setLessons]     = useState<Lesson[]>(LESSONS);
  const [activeId, setActiveId]   = useState('l04');
  const [playing, setPlaying]     = useState(false);
  const [notes, setNotes]         = useState<Note[]>(INITIAL_NOTES);
  const [draft, setDraft]         = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [panelTab, setPanelTab]   = useState<PanelTab>('playlist');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompact = useIsCompact(900);

  // Trang là "app cố định toàn viewport" — khóa cuộn html/body, chỉ những
  // vùng chủ đích (cột video ở compact mode, list note/playlist) mới cuộn.
  useEffect(() => {
    const html = document.documentElement.style;
    const body = document.body.style;
    const prevHtml = html.overflow;
    const prevBody = body.overflow;
    html.overflow = 'hidden';
    body.overflow = 'hidden';
    return () => { html.overflow = prevHtml; body.overflow = prevBody; };
  }, []);

  const active = lessons.find(l => l.id === activeId)!;
  const done   = lessons.filter(l => l.status === 'completed').length;
  const pct    = Math.round((done / lessons.length) * 100);

  const markDone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLessons(prev => prev.map(l => l.id !== id ? l : {
      ...l, status: l.status === 'completed' ? 'not_started' : 'completed',
    }));
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setNotes(p => [{ id: Date.now().toString(), time: '11:42', text: draft.trim() }, ...p]);
    setDraft('');
  };

  const toggleFocus = () => {
    setFocusMode(v => !v);
    setOverlayOpen(false);
  };

  /* ── Compact zone: dùng chung cho rail mặc định lẫn overlay focus mode ── */
  const renderTabs = () => (
    <div style={{ flexShrink: 0, display: 'flex', borderBottom: `1px solid ${T.border}` }}>
      {([
        { key: 'playlist' as const, label: 'Bài học', count: `${done}/${lessons.length}` },
        { key: 'notes'    as const, label: 'Ghi chú', count: String(notes.length) },
      ]).map(tab => {
        const isActive = panelTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setPanelTab(tab.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6,
              padding: '12px 8px', background: 'none', cursor: 'pointer',
              border: 'none', borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
              fontFamily: T.sans, fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? T.ink : T.inkMuted,
              transition: 'color 120ms, border-color 120ms',
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: isActive ? T.accent : T.inkDim }}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );

  // Cấu trúc "trang vở kẻ lề": metadata (số bài / timestamp) nằm trong lề
  // trái, một đường kẻ lề mực xanh chạy DỌC LIÊN TỤC, nội dung nằm bên phải.
  // Motif này thay cho lưới border cũ — ít đường kẻ hơn hẳn mà thứ tự rõ hơn,
  // vì đường kẻ duy nhất còn lại MÃ HÓA đúng một điều: trái là meta, phải là nội dung.
  const renderPlaylist = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }} className="cs-scrollbar">
      {lessons.map((l, i) => {
        const isActive = l.id === activeId;
        const isDone   = l.status === 'completed';
        const isNext   = l.status === 'not_started' &&
          lessons.slice(0, i).every(p => p.status === 'completed' || p.id === activeId);

        return (
          <div
            key={l.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveId(l.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveId(l.id); } }}
            className="vd-focusable"
            style={{
              display: 'flex', alignItems: 'stretch',
              cursor: 'pointer',
              background: isActive ? T.accentA : 'transparent',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(33,38,51,0.03)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? T.accentA : 'transparent'; }}
          >
            <span style={{
              width: MARGIN_W, flexShrink: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 13,
              fontFamily: T.mono, fontSize: 11,
              color: isActive ? T.accent : T.inkDim,
              fontWeight: isActive ? 600 : 400,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>

            <div style={{
              flex: 1, minWidth: 0,
              borderLeft: `1px solid ${T.marginLn}`,
              padding: '11px 12px 11px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.sans, fontSize: 14, lineHeight: 1.4,
                  color: isActive ? T.ink : isDone ? T.inkMuted : T.inkMid,
                  fontWeight: isActive ? 600 : 450,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {l.title}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, marginTop: 4, display: 'flex', gap: 8 }}>
                  <span>{l.duration}</span>
                  {isNext && <span style={{ color: T.accent, fontFamily: T.sans, fontWeight: 500 }}>tiếp theo →</span>}
                </div>
              </div>

              <button
                onClick={e => markDone(l.id, e)}
                aria-label={isDone ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
                className="vd-focusable"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', flexShrink: 0 }}
              >
                {isDone
                  ? <CheckCircle2 size={15} style={{ color: T.accent }} />
                  : <Circle       size={15} style={{ color: T.inkDim }} />
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderNotes = () => (
    <>
      <form onSubmit={addNote} style={{ flexShrink: 0, display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${T.border}` }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.mono, fontSize: 11, color: T.inkMuted,
          userSelect: 'none',
        }}>
          11:42
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.marginLn}` }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ghi lại ý quan trọng tại phút này…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: T.sans, fontSize: 15, color: T.ink,
              padding: '12px 12px 12px 14px', caretColor: T.accent,
            }}
          />
          <button
            type="submit"
            aria-label="Thêm ghi chú"
            className="vd-focusable"
            style={{
              padding: '10px 14px', background: 'none', border: 'none',
              cursor: 'pointer', color: T.inkDim,
              display: 'flex', alignItems: 'center',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.inkDim; }}
          >
            <Plus size={15} />
          </button>
        </div>
      </form>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 6 }} className="cs-scrollbar">
        {notes.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{ width: MARGIN_W, flexShrink: 0 }} />
            <div style={{
              flex: 1, borderLeft: `1px solid ${T.marginLn}`,
              padding: '14px 12px 14px 14px',
              fontFamily: T.sans, fontSize: 14, color: T.inkDim,
            }}>
              Chưa có ghi chú nào. Nét mực đầu tiên của bạn sẽ nằm ở đây.
            </div>
          </div>
        )}
        {notes.map(n => (
          <div key={n.id} className="vd-ink-in" style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{
              width: MARGIN_W, flexShrink: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 13,
              fontFamily: T.mono, fontSize: 11, color: T.inkMuted,
            }}>
              {n.time}
            </span>
            <span style={{
              flex: 1, borderLeft: `1px solid ${T.marginLn}`,
              fontFamily: T.sans, fontSize: 15, color: T.inkMid,
              padding: '11px 12px 11px 14px', lineHeight: 1.6,
            }}>
              {n.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  // Ánh sáng phòng học — signature của trang: nền phản ứng theo trạng thái.
  const roomBg = focusMode ? T.room : playing ? T.pageDim : T.page;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        .vd-focusable:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 4px;
        }
        @keyframes vd-ink-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vd-ink-in { animation: vd-ink-in 400ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .vd-ink-in { animation: none; }
        }
      `}</style>

      {/* ══ TITLE BAR — chrome phẳng, một hairline. Trong focus mode nó
          "tắt đèn" cùng căn phòng: nền chuyển màu phòng tối, chữ thành mực
          sáng mờ — cùng nhịp transition 600ms với workspace. ══ */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: TOP_BAR_H,
        zIndex: 50,
        background: focusMode ? T.room : T.panel,
        borderBottom: `1px solid ${focusMode ? 'rgba(244,246,252,0.10)' : T.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 8,
        fontFamily: T.sans, fontSize: 12.5,
        color: focusMode ? 'rgba(244,246,252,0.45)' : T.inkMuted,
        transition: 'background 600ms ease, border-color 600ms ease, color 600ms ease',
      }}>
        <span>Spaces</span>
        <ChevronRight size={11} style={{ color: focusMode ? 'rgba(244,246,252,0.25)' : T.inkDim }} />
        <span>Lập trình web</span>
        <ChevronRight size={11} style={{ color: focusMode ? 'rgba(244,246,252,0.25)' : T.inkDim }} />
        <span style={{ color: focusMode ? 'rgba(244,246,252,0.85)' : T.ink, fontWeight: 500 }}>{active.chapter}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 80, height: 2, overflow: 'hidden', borderRadius: 1,
              background: focusMode ? 'rgba(244,246,252,0.16)' : 'rgba(33,38,51,0.14)',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: focusMode ? T.accentScreen : T.accent,
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: focusMode ? T.accentScreen : T.accent }}>{pct}%</span>
          </div>

          <button
            onClick={toggleFocus}
            aria-label={focusMode ? 'Thoát focus mode' : 'Vào focus mode'}
            title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn video'}
            className="vd-focusable"
            style={{
              background: focusMode ? 'rgba(143,166,238,0.14)' : 'none',
              border: `1px solid ${focusMode ? T.accentScreen : T.border}`, borderRadius: R.sm,
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: focusMode ? T.accentScreen : T.inkMid, flexShrink: 0,
            }}
          >
            {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* ══ WORKSPACE — căn phòng: nền đổi theo trạng thái (page/dim/room) ══ */}
      <div style={{
        position: 'fixed',
        top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        zIndex: 1,
        display: 'flex', justifyContent: 'center',
        background: roomBg,
        transition: 'background 600ms ease',
      }}>
        {/* Container FLUID — không còn maxWidth cố định: gutter trái/phải
            luôn nhỏ (32px), video lớn dần theo bề ngang màn hình và tự DỪNG
            khi chiều cao chạm trần 72vh (giữ dải thở dưới) — quy tắc dừng
            nằm ở công thức min(100%, 72vh*16/9) của stage. */}
        <div style={{
          width: '100%',
          padding: isCompact ? '0 16px' : '0 32px',
          display: 'grid',
          gridTemplateColumns: (focusMode || isCompact) ? '1fr' : '1fr 340px',
          gap: isCompact ? 16 : 36,
          height: '100%',
        }}>

          {/* ══ LEFT COLUMN — video ══ */}
          <div style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            height: '100%',
            overflow: (isCompact && !focusMode) ? 'auto' : 'hidden',
            justifyContent: focusMode ? 'center' : 'flex-start',
          }}
          className={(isCompact && !focusMode) ? 'cs-scrollbar' : undefined}
          >

            {/* Header = MỘT dòng h1. Mọi meta khác đều đã có chỗ riêng:
                chương → breadcrumb, số bài & thời lượng → playlist (lề vở),
                thời lượng đang phát → thanh control của video. Header chỉ
                giữ thứ duy nhất không tồn tại ở nơi khác: tên bài học. */}
            {!focusMode && (
              <div style={{ flexShrink: 0, paddingTop: 18, paddingBottom: 14 }}>
                <h1 style={{
                  fontFamily: T.sans, fontSize: 'clamp(19px, 2.1vw, 26px)', fontWeight: 700,
                  letterSpacing: '-0.015em', lineHeight: 1.25,
                  margin: 0, color: T.ink,
                }}>
                  {active.title}
                </h1>
              </div>
            )}

            {/* Stage — khung tỉ lệ 16:9, hệ quy chiếu cho overlay focus mode
                (overlay LUÔN cao đúng bằng video). Trần chiều cao theo TỈ LỆ
                THUẦN của vh (không trừ hằng số px — trừ px cố định khỏi vh
                làm video co lại không cân xứng ở zoom cao). */}
            {/* Stage 16:9 — desktop dùng công thức liên tục "vh trừ phần bị
                chiếm thật + sàn vh" (xem chú thích HEADER_H/BREATH); focus và
                compact giữ trần vh riêng vì bố cục dọc khác hẳn. Luôn căn giữa
                cột để cân đối khi chiều cao chặn trước bề ngang. */}
            <div style={{
              position: 'relative',
              width: focusMode
                ? 'min(100%, calc(82vh * 16 / 9))' // rạp chiếu: viền tối tỉ lệ thuận là chủ đích
                : isCompact
                  ? `min(100%, max(calc(${COMPACT_FLOOR_VH}vh * 16 / 9), calc((100vh - ${TOP_BAR_H + HEADER_H + PANEL_PEEK}px) * 16 / 9)))`
                  : `min(100%, max(calc(${VIDEO_FLOOR_VH}vh * 16 / 9), calc((100vh - ${TOP_BAR_H + HEADER_H + BREATH}px) * 16 / 9)))`,
              aspectRatio: '16/9',
              margin: '0 auto',
            }}>

              <div style={{
                width: '100%', height: '100%',
                background: T.screen, // màn hình luôn tối như thiết bị thật
                border: `1px solid ${focusMode ? 'rgba(255,255,255,0.10)' : T.borderHi}`,
                borderRadius: R.md,
                boxShadow: T.shadowMd,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={() => setPlaying(v => !v)}
                    aria-label={playing ? 'Tạm dừng' : 'Phát video'}
                    className="vd-focusable"
                    style={{
                      width: 52, height: 52, borderRadius: '50%',
                      border: 'none', background: T.accent, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 150ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    {playing
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill={T.onAccent}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill={T.onAccent} style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21"/></svg>
                    }
                  </button>
                </div>
                <div style={{
                  height: 36, borderTop: `1px solid rgba(255,255,255,0.10)`,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
                  fontFamily: T.mono, fontSize: 11, color: 'rgba(255,255,255,0.55)', flexShrink: 0,
                }}>
                  <span>11:42</span>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                    <div style={{ width: '42%', height: '100%', background: T.accentScreen }} />
                  </div>
                  <span>{active.duration}</span>
                  <span style={{ color: T.accentScreen, marginLeft: 8 }}>✓ đã lưu</span>
                </div>
              </div>

              {/* ── FOCUS MODE: phòng đã tối sẵn; scrim nhẹ + panel trắng như đèn bàn ── */}
              {focusMode && (
                <>
                  <div
                    onClick={() => setOverlayOpen(false)}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(10,12,16,0.45)',
                      opacity: overlayOpen ? 1 : 0,
                      pointerEvents: overlayOpen ? 'auto' : 'none',
                      transition: 'opacity 200ms ease', zIndex: 25,
                    }}
                  />

                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 30,
                    width: 'min(440px, 92%)',
                    display: 'flex', flexDirection: 'column',
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: R.lg, overflow: 'hidden',
                    boxShadow: T.shadowMd,
                    opacity: overlayOpen ? 1 : 0,
                    transform: overlayOpen ? 'translateX(0)' : 'translateX(12px)',
                    pointerEvents: overlayOpen ? 'auto' : 'none',
                    transition: 'opacity 200ms ease, transform 200ms ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>{renderTabs()}</div>
                      <button
                        onClick={() => setOverlayOpen(false)}
                        aria-label="Ẩn overlay"
                        className="vd-focusable"
                        style={{
                          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                          color: T.inkDim, padding: '0 14px', display: 'flex', alignItems: 'center',
                          borderBottom: `1px solid ${T.border}`, height: '100%',
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setOverlayOpen(v => !v);
                      requestAnimationFrame(() => { if (panelTab === 'notes') inputRef.current?.focus(); });
                    }}
                    className="vd-focusable"
                    style={{
                      position: 'absolute', right: 16, bottom: 16, zIndex: 20,
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 16px',
                      background: T.panel, border: 'none',
                      borderRadius: R.sm, cursor: 'pointer',
                      boxShadow: T.shadowMd,
                      fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: T.inkMid,
                      opacity: overlayOpen ? 0 : 1,
                      pointerEvents: overlayOpen ? 'none' : 'auto',
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    <ListVideo size={13} />
                    <StickyNote size={13} />
                    <span>{done}/{lessons.length} · {notes.length} ghi chú</span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, marginLeft: 2 }}>⌥N</span>
                  </button>
                </>
              )}
            </div>

            {/* Compact & không focus: tab Bài học/Ghi chú xếp dưới video */}
            {isCompact && !focusMode && (
              <div style={{
                flexShrink: 0, marginTop: 16, minHeight: 360,
                display: 'flex', flexDirection: 'column',
                background: T.panel, border: `1px solid ${T.border}`,
                borderRadius: R.md, overflow: 'hidden',
                boxShadow: T.shadowSm,
              }}>
                {renderTabs()}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
                  {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT — rail cố định, chỉ dùng khi đủ chỗ ngang ══ */}
          {!focusMode && !isCompact && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              height: 'calc(100% - 30px)', marginTop: 30, // căn mép trên với nhãn chương, không phải mép video
              overflow: 'hidden',
              background: T.panel, border: `1px solid ${T.border}`,
              borderRadius: R.md, boxShadow: T.shadowSm,
            }}>
              {renderTabs()}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
