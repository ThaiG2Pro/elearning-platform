'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, ChevronRight, StickyNote, X, Maximize2, Minimize2, ListVideo } from 'lucide-react';
import { T, R, TOP_BAR_H, MARGIN_W, useIsCompact, VIBE_GLOBAL_CSS, beVietnam } from '@/lib/vibe/theme';

/*
 * PILOT chuyển sang Tailwind (namespace `ink-*`, tailwind.config.js) — cùng
 * pattern đã áp dụng ở about/page.tsx: chỉ đổi cách tô màu/font, không đổi
 * hành vi. Trang này có nhiều style PHỤ THUỘC RUNTIME hơn (focusMode/playing/
 * isActive/overlayOpen…) nên vẫn giữ `T`/`R` cho: box-shadow (không có entry
 * Tailwind), bán kính bo góc R.* (hằng số JS dùng chung), và các JS handler
 * thao tác trực tiếp element.style (onMouseEnter/onMouseLeave). Công thức
 * kích thước video liên tục (HEADER_H/BREATH/VIDEO_FLOOR_VH/PANEL_PEEK/
 * COMPACT_FLOOR_VH) giữ NGUYÊN VẸN như cũ — không đụng vào phần calc()/clamp().
 */

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

type PanelTab = 'playlist' | 'notes';

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
    <div className="shrink-0 flex border-b border-ink-border">
      {([
        { key: 'playlist' as const, label: 'Bài học', count: `${done}/${lessons.length}` },
        { key: 'notes'    as const, label: 'Ghi chú', count: String(notes.length) },
      ]).map(tab => {
        const isActive = panelTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setPanelTab(tab.key)}
            className={`flex-1 flex items-baseline justify-center gap-1.5 py-3 px-2 bg-transparent cursor-pointer border-0 border-b-2 text-sm transition-colors duration-[120ms] ${
              isActive ? 'border-ink-accent font-semibold text-ink-text' : 'border-transparent font-normal text-ink-textMuted'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`font-mono text-[11px] ${isActive ? 'text-ink-accent' : 'text-ink-textDim'}`}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );

  // Cấu trúc "trang vở kẻ lề": metadata (số bài / timestamp) nằm trong lề
  // trái, một đường kẻ lề mực xanh chạy DỌC LIÊN TỤC, nội dung nằm bên phải.
  // Motif này thay cho lưới border cũ — ít đường kẻ hơn hẳn mà thứ tự rõ hơn,
  // vì đường kẻ duy nhất còn lại MÃ HÓA đúng một điều: trái là meta, phải là nội dung.
  // Đã kiểm tra: container này luôn nằm trong một cha flex có chiều cao BỊ
  // CHẶN thật (rail desktop dùng h-[calc(100%-30px)], overlay focus dùng
  // top/bottom:0, compact dùng cột trái cuộn nguyên khối) — nên `flex-1
  // overflow-y-auto` ở đây luôn có trần để cuộn, danh sách 30+ bài học sẽ
  // cuộn trong khung này chứ không đẩy video ra ngoài. Title đã truncate +
  // có tooltip title={l.title} nên tên bài dài không phá vỡ chiều cao dòng.
  const renderPlaylist = () => (
    <div className="flex-1 overflow-y-auto py-1.5 cs-scrollbar">
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
            className={`vd-focusable flex items-stretch cursor-pointer transition-colors duration-[120ms] ${isActive ? 'bg-ink-accentA' : 'bg-transparent'}`}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(33,38,51,0.03)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? T.accentA : 'transparent'; }}
          >
            <span
              style={{ width: MARGIN_W }}
              className={`shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] ${isActive ? 'font-semibold text-ink-accent' : 'font-normal text-ink-textDim'}`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0 border-l border-ink-marginLn pt-[11px] pr-3 pb-[11px] pl-3.5 flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <div
                  title={l.title}
                  className={`truncate leading-[1.4] text-sm ${isActive ? 'font-semibold text-ink-text' : `font-[450] ${isDone ? 'text-ink-textMuted' : 'text-ink-textMid'}`}`}
                >
                  {l.title}
                </div>
                <div className="mt-1 flex gap-2 font-mono text-[11px] text-ink-textDim">
                  <span>{l.duration}</span>
                  {isNext && <span className="text-ink-accent font-medium">tiếp theo →</span>}
                </div>
              </div>

              <button
                onClick={e => markDone(l.id, e)}
                aria-label={isDone ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
                className="vd-focusable bg-transparent border-none cursor-pointer pt-0.5 shrink-0"
              >
                {isDone
                  ? <CheckCircle2 size={15} className="text-ink-accent" />
                  : <Circle       size={15} className="text-ink-textDim" />
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Danh sách ghi chú dùng cùng pattern cuộn đã kiểm tra ở renderPlaylist
  // (`flex-1 overflow-y-auto` bên trong một cha có chiều cao bị chặn) — nhiều
  // ghi chú dài sẽ cuộn trong khung này. Nội dung ghi chú KHÔNG truncate (chỉ
  // truncate tiêu đề bài học ở playlist) vì người dùng cần đọc lại đủ note.
  const renderNotes = () => (
    <>
      <form onSubmit={addNote} className="shrink-0 flex items-stretch border-b border-ink-border">
        <span
          style={{ width: MARGIN_W }}
          className="shrink-0 flex items-center justify-center font-mono text-[11px] text-ink-textMuted select-none"
        >
          11:42
        </span>
        <div className="flex-1 flex items-center border-l border-ink-marginLn">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ghi lại ý quan trọng tại phút này…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-ink-text pt-3 pr-3 pb-3 pl-3.5 caret-ink-accent"
          />
          <button
            type="submit"
            aria-label="Thêm ghi chú"
            className="vd-focusable flex items-center bg-transparent border-none cursor-pointer text-ink-textDim transition-colors duration-150 py-2.5 px-3.5"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.inkDim; }}
          >
            <Plus size={15} />
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto pb-1.5 cs-scrollbar">
        {notes.length === 0 && (
          <div className="flex items-stretch">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <div className="flex-1 border-l border-ink-marginLn pt-3.5 pr-3 pb-3.5 pl-3.5 text-sm text-ink-textDim">
              Chưa có ghi chú nào. Nét mực đầu tiên của bạn sẽ nằm ở đây.
            </div>
          </div>
        )}
        {notes.map(n => (
          <div key={n.id} className="vd-ink-in flex items-stretch">
            <span
              style={{ width: MARGIN_W }}
              className="shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] text-ink-textMuted"
            >
              {n.time}
            </span>
            <span className="flex-1 border-l border-ink-marginLn text-[15px] text-ink-textMid pt-[11px] pr-3 pb-[11px] pl-3.5 leading-[1.6]">
              {n.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  // Ánh sáng phòng học — signature của trang: nền phản ứng theo trạng thái.
  const roomBgClass = focusMode ? 'bg-ink-room' : playing ? 'bg-ink-pageDim' : 'bg-ink-page';

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className={beVietnam.className}>
      <style>{VIBE_GLOBAL_CSS}</style>

      {/* ══ TITLE BAR — chrome phẳng, một hairline. Trong focus mode nó
          "tắt đèn" cùng căn phòng: nền chuyển màu phòng tối, chữ thành mực
          sáng mờ — cùng nhịp transition 600ms với workspace. ══ */}
      <div
        style={{ height: TOP_BAR_H }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-7 text-[12.5px] border-b transition-[background,border-color,color] duration-[600ms] ease-in-out ${
          focusMode ? 'bg-ink-room border-[rgba(244,246,252,0.10)] text-[rgba(244,246,252,0.45)]' : 'bg-ink-panel border-ink-border text-ink-textMuted'
        }`}
      >
        {/* Mục 2 — cùng lỗi phát hiện ở article/quiz: span breadcrumb không
            shrink-0/whitespace-nowrap bị flex ép co lại và wrap chữ ở màn
            hẹp. Hạ cứng trước ở đây luôn, dù chưa thấy báo lỗi trực tiếp
            trên trang này. */}
        <span className="shrink-0 whitespace-nowrap">Spaces</span>
        {!isCompact && (
          <>
            <ChevronRight size={11} className={`shrink-0 ${focusMode ? 'text-[rgba(244,246,252,0.25)]' : 'text-ink-textDim'}`} />
            <span className="shrink-0 whitespace-nowrap">Lập trình web</span>
          </>
        )}
        <ChevronRight size={11} className={`shrink-0 ${focusMode ? 'text-[rgba(244,246,252,0.25)]' : 'text-ink-textDim'}`} />
        <span
          title={active.chapter}
          className={`flex-1 min-w-0 truncate font-medium ${focusMode ? 'text-[rgba(244,246,252,0.85)]' : 'text-ink-text'}`}
        >
          {active.chapter}
        </span>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-20 h-0.5 overflow-hidden rounded-[1px] ${focusMode ? 'bg-[rgba(244,246,252,0.16)]' : 'bg-[rgba(33,38,51,0.14)]'}`}>
              <div
                style={{ width: `${pct}%` }}
                className={`h-full transition-[width] duration-[400ms] ease-in-out ${focusMode ? 'bg-ink-accentScreen' : 'bg-ink-accent'}`}
              />
            </div>
            <span className={`font-mono text-[11px] ${focusMode ? 'text-ink-accentScreen' : 'text-ink-accent'}`}>{pct}%</span>
          </div>

          <button
            onClick={toggleFocus}
            aria-label={focusMode ? 'Thoát focus mode' : 'Vào focus mode'}
            title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn video'}
            className={`vd-focusable flex items-center justify-center w-[26px] h-[26px] cursor-pointer shrink-0 border ${
              focusMode ? 'bg-[rgba(143,166,238,0.14)] border-ink-accentScreen text-ink-accentScreen' : 'bg-transparent border-ink-border text-ink-textMid'
            }`}
            style={{ borderRadius: R.sm }}
          >
            {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* ══ WORKSPACE — căn phòng: nền đổi theo trạng thái (page/dim/room) ══ */}
      <div
        style={{ top: TOP_BAR_H }}
        className={`fixed left-0 right-0 bottom-0 z-[1] flex justify-center transition-[background] duration-[600ms] ease-in-out ${roomBgClass}`}
      >
        {/* Container FLUID — không còn maxWidth cố định: gutter trái/phải
            luôn nhỏ (32px), video lớn dần theo bề ngang màn hình và tự DỪNG
            khi chiều cao chạm trần 72vh (giữ dải thở dưới) — quy tắc dừng
            nằm ở công thức min(100%, 72vh*16/9) của stage. */}
        <div
          className="w-full h-full grid"
          style={{
            padding: isCompact ? '0 16px' : '0 32px',
            gridTemplateColumns: (focusMode || isCompact) ? '1fr' : '1fr 340px',
            gap: isCompact ? 16 : 36,
          }}
        >

          {/* ══ LEFT COLUMN — video ══ */}
          <div
            className={`relative flex flex-col h-full ${(isCompact && !focusMode) ? 'overflow-auto cs-scrollbar' : 'overflow-hidden'} ${focusMode ? 'justify-center' : 'justify-start'}`}
          >

            {/* Header = MỘT dòng h1. Mọi meta khác đều đã có chỗ riêng:
                chương → breadcrumb, số bài & thời lượng → playlist (lề vở),
                thời lượng đang phát → thanh control của video. Header chỉ
                giữ thứ duy nhất không tồn tại ở nơi khác: tên bài học. */}
            {!focusMode && (
              <div className="shrink-0 pt-[18px] pb-3.5">
                <h1
                  title={active.title}
                  className="truncate text-[clamp(19px,2.1vw,26px)] font-bold tracking-[-0.015em] leading-[1.25] m-0 text-ink-text"
                >
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
            <div
              className="relative aspect-video mx-auto"
              style={{
                width: focusMode
                  ? 'min(100%, calc(82vh * 16 / 9))' // rạp chiếu: viền tối tỉ lệ thuận là chủ đích
                  : isCompact
                    ? `min(100%, max(calc(${COMPACT_FLOOR_VH}vh * 16 / 9), calc((100vh - ${TOP_BAR_H + HEADER_H + PANEL_PEEK}px) * 16 / 9)))`
                    : `min(100%, max(calc(${VIDEO_FLOOR_VH}vh * 16 / 9), calc((100vh - ${TOP_BAR_H + HEADER_H + BREATH}px) * 16 / 9)))`,
              }}
            >

              <div
                className={`w-full h-full bg-ink-screen border flex flex-col overflow-hidden ${focusMode ? 'border-[rgba(255,255,255,0.10)]' : 'border-ink-borderHi'}`}
                style={{ borderRadius: R.md, boxShadow: T.shadowMd }}
              >
                <div className="flex-1 flex items-center justify-center">
                  <button
                    onClick={() => setPlaying(v => !v)}
                    aria-label={playing ? 'Tạm dừng' : 'Phát video'}
                    className="vd-focusable w-[52px] h-[52px] rounded-full border-none bg-ink-accent cursor-pointer flex items-center justify-center transition-transform duration-150 ease-in-out"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    {playing
                      ? <svg width="18" height="18" viewBox="0 0 24 24" className="fill-ink-onAccent"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" className="fill-ink-onAccent ml-0.5"><polygon points="5,3 19,12 5,21"/></svg>
                    }
                  </button>
                </div>
                <div className="h-9 border-t border-[rgba(255,255,255,0.10)] flex items-center gap-2.5 px-4 font-mono text-[11px] text-[rgba(255,255,255,0.55)] shrink-0">
                  <span>11:42</span>
                  <div className="flex-1 h-0.5 bg-[rgba(255,255,255,0.16)] overflow-hidden">
                    <div className="w-[42%] h-full bg-ink-accentScreen" />
                  </div>
                  <span>{active.duration}</span>
                  <span className="text-ink-accentScreen ml-2">✓ đã lưu</span>
                </div>
              </div>

              {/* ── FOCUS MODE: phòng đã tối sẵn; scrim nhẹ + panel trắng như đèn bàn ── */}
              {focusMode && (
                <>
                  <div
                    onClick={() => setOverlayOpen(false)}
                    className={`absolute inset-0 bg-[rgba(10,12,16,0.45)] z-[25] transition-opacity duration-200 ease-in-out ${overlayOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  />

                  <div
                    className={`absolute right-0 top-0 bottom-0 z-30 w-[min(440px,92%)] flex flex-col bg-ink-panel border border-ink-border overflow-hidden transition-[opacity,transform] duration-200 ease-in-out ${
                      overlayOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-3 pointer-events-none'
                    }`}
                    style={{ borderRadius: R.lg, boxShadow: T.shadowMd }}
                  >
                    <div className="flex items-center">
                      <div className="flex-1">{renderTabs()}</div>
                      <button
                        onClick={() => setOverlayOpen(false)}
                        aria-label="Ẩn overlay"
                        className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim px-3.5 flex items-center border-b border-ink-border h-full"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setOverlayOpen(v => !v);
                      requestAnimationFrame(() => { if (panelTab === 'notes') inputRef.current?.focus(); });
                    }}
                    className={`vd-focusable absolute right-4 bottom-4 z-20 flex items-center gap-2 py-[9px] px-4 bg-ink-panel border-none cursor-pointer text-[12.5px] font-medium text-ink-textMid transition-opacity duration-150 ease-in-out ${
                      overlayOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
                    }`}
                    style={{ borderRadius: R.sm, boxShadow: T.shadowMd }}
                  >
                    <ListVideo size={13} />
                    <StickyNote size={13} />
                    <span>{done}/{lessons.length} · {notes.length} ghi chú</span>
                    <span className="font-mono text-[11px] text-ink-textDim ml-0.5">⌥N</span>
                  </button>
                </>
              )}
            </div>

            {/* Compact & không focus: tab Bài học/Ghi chú xếp dưới video */}
            {isCompact && !focusMode && (
              <div
                className="shrink-0 mt-4 min-h-[360px] flex flex-col bg-ink-panel border border-ink-border overflow-hidden"
                style={{ borderRadius: R.md, boxShadow: T.shadowSm }}
              >
                {renderTabs()}
                <div className="flex flex-col min-h-[320px]">
                  {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT — rail cố định, chỉ dùng khi đủ chỗ ngang ══ */}
          {!focusMode && !isCompact && (
            <div
              className="flex flex-col h-[calc(100%-30px)] mt-[30px] overflow-hidden bg-ink-panel border border-ink-border"
              style={{ borderRadius: R.md, boxShadow: T.shadowSm }}
            >
              {renderTabs()}
              <div className="flex-1 flex flex-col overflow-hidden">
                {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
