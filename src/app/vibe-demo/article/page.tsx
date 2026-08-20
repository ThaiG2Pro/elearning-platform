'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Maximize2, Minimize2, ListVideo, StickyNote, Plus } from 'lucide-react';
import { beVietnam, R, TOP_BAR_H, MARGIN_W, useIsCompact, VIBE_GLOBAL_CSS } from '@/lib/vibe/theme';

/* ─── Data ──────────────────────────────────────────────────────────────── */
type Status = 'completed' | 'in_progress' | 'not_started';

interface Lesson {
  id: string;
  title: string;
  chapter: string;
  duration: string;
  status: Status;
}

// Bản article của vibe-demo: bài đang học là l04 (Bài đọc).
const LESSONS: Lesson[] = [
  { id: 'l01', title: 'Virtual DOM & Reconciliation',        chapter: 'Nền tảng React 18',    duration: '14:20',   status: 'completed'   },
  { id: 'l02', title: 'App Router, JSX & Component Model',  chapter: 'Nền tảng React 18',    duration: '22:15',   status: 'completed'   },
  { id: 'l03', title: 'Quiz — Nền tảng React',              chapter: 'Nền tảng React 18',    duration: '10 câu',  status: 'completed'   },
  { id: 'l04', title: 'Bài đọc — Hooks: tư duy đúng',       chapter: 'Hooks & State',        duration: '8 phút',  status: 'in_progress' },
  { id: 'l05', title: 'useMemo, useCallback & Performance', chapter: 'Hooks & State',        duration: '35:10',   status: 'not_started' },
  { id: 'l06', title: 'Custom Hooks Pattern',               chapter: 'Hooks & State',        duration: '19:50',   status: 'not_started' },
  { id: 'l07', title: 'TanStack Query & REST API',          chapter: 'Async & Server Comp.', duration: '42:15',   status: 'not_started' },
  { id: 'l08', title: 'Server vs Client Components',        chapter: 'Async & Server Comp.', duration: '31:00',   status: 'not_started' },
];

// Ghi chú của bài đọc neo theo MỤC (§) thay vì timestamp — cùng cấu trúc
// "lề vở" với bản video, chỉ đổi đơn vị neo.
interface Note { id: string; anchor: string; text: string; }
const INITIAL_NOTES: Note[] = [
  { id: 'n1', anchor: '§1', text: 'State của mỗi lần render là bất biến — closure giữ đúng bản đó' },
  { id: 'n2', anchor: '§3', text: 'Effect chạy SAU paint, không chặn hiển thị' },
];

type PanelTab = 'playlist' | 'notes';

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeArticleDemoPage() {
  const [lessons, setLessons]     = useState<Lesson[]>(LESSONS);
  const [activeId, setActiveId]   = useState('l04');
  const [notes, setNotes]         = useState<Note[]>(INITIAL_NOTES);
  const [draft, setDraft]         = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [panelTab, setPanelTab]   = useState<PanelTab>('notes');
  const inputRef  = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isCompact = useIsCompact(900);

  const [readPct, setReadPct]           = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const html = document.documentElement.style;
    const body = document.body.style;
    const prevHtml = html.overflow;
    const prevBody = body.overflow;
    html.overflow = 'hidden';
    body.overflow = 'hidden';
    return () => { html.overflow = prevHtml; body.overflow = prevBody; };
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setReadPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100);
    const y = el.scrollTop + 140;
    let idx = 0;
    sectionRefs.current.forEach((s, i) => { if (s && s.offsetTop <= y) idx = i; });
    setActiveSection(idx);
  };

  const active = lessons.find(l => l.id === activeId)!;
  const done   = lessons.filter(l => l.status === 'completed').length;
  const pct    = Math.round((done / lessons.length) * 100);
  const isRead = active.status === 'completed';

  const markDone = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLessons(prev => prev.map(l => l.id !== id ? l : {
      ...l, status: l.status === 'completed' ? 'not_started' : 'completed',
    }));
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setNotes(p => [{ id: Date.now().toString(), anchor: `§${activeSection + 1}`, text: draft.trim() }, ...p]);
    setDraft('');
  };

  const toggleFocus = () => {
    setFocusMode(v => !v);
    setOverlayOpen(false);
  };

  /* ── Rail: tab Bài học / Ghi chú (cùng cấu trúc với bản video) ── */
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
            className={`flex-1 flex items-baseline justify-center gap-1.5 py-3 px-2 bg-none cursor-pointer border-0 border-b-2 text-sm transition-colors duration-[120ms] ${
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
            className="vd-focusable flex items-stretch cursor-pointer transition-colors duration-[120ms]"
            style={{ background: isActive ? 'rgba(46,74,158,0.08)' : 'transparent' }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(33,38,51,0.03)'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(46,74,158,0.08)' : 'transparent'; }}
          >
            <span
              style={{ width: MARGIN_W }}
              className={`shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] ${
                isActive ? 'text-ink-accent font-semibold' : 'text-ink-textDim font-normal'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0 border-l border-ink-marginLn py-[11px] pr-3 pl-[14px] flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <div className={`text-sm leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap ${
                  isActive ? 'text-ink-text font-semibold' : `font-[450] ${isDone ? 'text-ink-textMuted' : 'text-ink-textMid'}`
                }`}>
                  {l.title}
                </div>
                <div className="font-mono text-[11px] text-ink-textDim mt-1 flex gap-2">
                  <span>{l.duration}</span>
                  {isNext && <span className="text-ink-accent font-medium">tiếp theo →</span>}
                </div>
              </div>

              <button
                onClick={e => markDone(l.id, e)}
                aria-label={isDone ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
                className="vd-focusable bg-none border-0 cursor-pointer pt-0.5 pb-0 px-0 shrink-0"
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

  const renderNotes = () => (
    <>
      <form onSubmit={addNote} className="shrink-0 flex items-stretch border-b border-ink-border">
        <span
          style={{ width: MARGIN_W }}
          className="shrink-0 flex items-center justify-center font-mono text-[11px] text-ink-textMuted select-none"
        >
          §{activeSection + 1}
        </span>
        <div className="flex-1 flex items-center border-l border-ink-marginLn">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ghi chú cho mục đang đọc…"
            className="flex-1 bg-transparent border-0 outline-none text-[15px] text-ink-text py-3 pr-3 pl-[14px]"
            style={{ caretColor: '#2E4A9E' }}
          />
          <button
            type="submit"
            aria-label="Thêm ghi chú"
            className="vd-focusable py-2.5 px-3.5 bg-none border-0 cursor-pointer text-ink-textDim flex items-center transition-colors duration-150"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2E4A9E'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(33,38,51,0.28)'; }}
          >
            <Plus size={15} />
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto pb-1.5 cs-scrollbar">
        {notes.length === 0 && (
          <div className="flex items-stretch">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <div className="flex-1 border-l border-ink-marginLn pt-3.5 pr-3 pb-3.5 pl-[14px] text-sm text-ink-textDim">
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
              {n.anchor}
            </span>
            <span className="flex-1 border-l border-ink-marginLn text-[15px] text-ink-textMid py-[11px] pr-3 pl-[14px] leading-[1.6]">
              {n.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  /* ── Các khối văn bản theo ngữ pháp lề vở ── */
  const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div ref={el => { sectionRefs.current[n - 1] = el; }}>
      <div className="flex items-stretch pt-[30px]">
        <span
          style={{ width: MARGIN_W }}
          className={`shrink-0 flex items-start justify-center pt-1 font-mono text-xs font-semibold transition-colors duration-200 ${
            activeSection === n - 1 ? 'text-ink-accent' : 'text-ink-textDim'
          }`}
        >
          §{n}
        </span>
        <h2 className="flex-1 border-l border-ink-marginLn pt-0 pr-8 pb-0 pl-[22px] m-0 text-[19px] font-bold tracking-[-0.01em] text-ink-text leading-[1.4]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );

  const P = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-stretch">
      <span style={{ width: MARGIN_W }} className="shrink-0" />
      <p className="flex-1 border-l border-ink-marginLn pt-3 pr-8 pb-1 pl-[22px] m-0 text-base font-normal text-ink-textMid leading-[1.75]">
        {children}
      </p>
    </div>
  );

  const Code = ({ code }: { code: string }) => (
    <div className="flex items-stretch">
      <span
        style={{ width: MARGIN_W }}
        className="shrink-0 flex items-start justify-center pt-[22px] font-mono text-[11px] text-ink-textDim"
      >
        {'</>'}
      </span>
      <div className="flex-1 border-l border-ink-marginLn pt-3.5 pr-8 pb-1 pl-[22px]">
        <pre
          style={{ borderRadius: R.sm }}
          className="m-0 py-4 px-[18px] bg-ink-codeBg border border-ink-border font-mono text-[13px] leading-[1.65] text-ink-text overflow-x-auto"
        >
          {code}
        </pre>
      </div>
    </div>
  );

  const Quote = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-stretch">
      <span
        style={{ width: MARGIN_W }}
        className="shrink-0 flex items-start justify-center pt-4 font-bold text-[22px] text-ink-accent leading-none"
      >
        “
      </span>
      <div className="flex-1 border-l-2 border-ink-accent pt-3.5 pr-8 pb-1.5 pl-[22px] text-[16.5px] italic font-medium text-ink-text leading-[1.7]">
        {children}
      </div>
    </div>
  );

  /* ── Trang sách — stage của bản article ── */
  const renderArticle = () => (
    <div
      style={{ borderRadius: R.lg, boxShadow: '0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)' }}
      className="w-[min(100%,720px)] mx-auto bg-ink-panel border border-ink-border overflow-hidden"
    >
      {/* Đầu trang */}
      <div className="flex items-stretch pt-[34px]">
        <span style={{ width: MARGIN_W }} className="shrink-0" />
        <div className="flex-1 border-l border-ink-marginLn pt-0 pr-8 pb-[22px] pl-[22px]">
          <div className="flex items-baseline gap-2.5 text-[13px] font-medium text-ink-textMuted mb-2">
            <span>Bài đọc</span>
            <span className="font-mono text-[11px] text-ink-textDim">{active.duration}</span>
            <span className={`ml-auto font-mono text-[11px] ${readPct >= 100 ? 'text-ink-accent' : 'text-ink-textDim'}`}>
              đã đọc {readPct}%
            </span>
          </div>
          <div className="text-[26px] font-bold tracking-[-0.015em] text-ink-text leading-[1.3]">
            Hooks: tư duy đúng về state và effect
          </div>
          <div className="text-[15.5px] text-ink-textMuted mt-2.5 leading-[1.65]">
            Bốn hiểu lầm phổ biến nhất khi mới học useState và useEffect — và mô hình
            tư duy thay thế cho từng cái.
          </div>
        </div>
      </div>

      <Section n={1} title="State là ảnh chụp, không phải biến">
        <P>
          Mỗi lần render, component của bạn nhận một <em>ảnh chụp</em> state tại thời điểm đó.
          Mọi biến, mọi hàm, mọi closure trong lần render ấy đều nhìn thấy đúng bản chụp này —
          không phải &quot;giá trị mới nhất&quot;. Đây là lý do một <code className="font-mono text-sm">setTimeout</code> đặt
          trong render cũ vẫn in ra giá trị cũ: nó đóng gói theo ảnh chụp của lần render đã tạo ra nó.
        </P>
        <P>
          Khi chấp nhận mô hình này, hàng loạt &quot;bug khó hiểu&quot; trở thành hành vi hiển nhiên:
          không phải React quên cập nhật, mà là bạn đang đọc một tấm ảnh cũ.
        </P>
      </Section>

      <Section n={2} title="setState là lời hẹn, không phải lệnh gán">
        <P>
          Gọi <code className="font-mono text-sm">setCount(count + 1)</code> không đổi
          giá trị ngay — nó <em>đặt lịch</em> một lần render mới. Trong cùng một event handler,
          gọi ba lần vẫn chỉ +1, vì cả ba lần đều đọc chung một ảnh chụp:
        </P>
        <Code code={`// count đang là 0
setCount(count + 1); // hẹn: render với 0 + 1
setCount(count + 1); // hẹn: render với 0 + 1 (vẫn đọc 0!)
setCount(count + 1); // hẹn: render với 0 + 1

// muốn cộng dồn → dùng hàm cập nhật, đọc state MỚI NHẤT
setCount(c => c + 1); // 0 → 1
setCount(c => c + 1); // 1 → 2
setCount(c => c + 1); // 2 → 3`} />
        <P>
          Quy tắc thực dụng: khi giá trị mới phụ thuộc giá trị cũ, luôn truyền hàm cập nhật.
        </P>
      </Section>

      <Section n={3} title="useEffect là đồng bộ hóa, không phải lifecycle">
        <P>
          Câu hỏi sai: &quot;effect này chạy lúc mount hay update?&quot;. Câu hỏi đúng:
          &quot;effect này <em>đồng bộ</em> component với hệ thống bên ngoài nào?&quot; —
          một subscription, một request, một thư viện DOM. React chỉ cam kết một điều:
          sau khi render xong, thế giới bên ngoài sẽ khớp với state hiện tại.
        </P>
        <Quote>
          Effect không thuộc về &quot;vòng đời component&quot; — nó thuộc về mối quan hệ
          giữa component và một hệ thống bên ngoài.
        </Quote>
        <P>
          Hệ quả trực tiếp: nếu effect của bạn không kết nối với thứ gì bên ngoài
          (chỉ tính toán từ props/state), rất có thể bạn không cần effect — hãy tính
          thẳng trong render hoặc trong event handler.
        </P>
      </Section>

      <Section n={4} title="Cleanup — trả phòng trước khi nhận phòng mới">
        <P>
          Hàm cleanup chạy <em>trước</em> lần chạy effect kế tiếp và khi component rời đi.
          Ba trường hợp bắt buộc phải có cleanup:
        </P>
        {[
          ['a', 'Subscription / event listener — không gỡ thì mỗi lần render chồng thêm một listener.'],
          ['b', 'Request bất đồng bộ — đánh dấu &quot;đã hủy&quot; để response về muộn không setState lên component đã unmount.'],
          ['c', 'Timer — clearInterval/clearTimeout, nếu không đồng hồ cũ vẫn chạy song song đồng hồ mới.'],
        ].map(([m, text]) => (
          <div key={m} className="flex items-stretch">
            <span
              style={{ width: MARGIN_W }}
              className="shrink-0 flex items-start justify-center pt-3.5 font-mono text-[11px] text-ink-textDim"
            >
              {m}
            </span>
            <div
              className="flex-1 border-l border-ink-marginLn pt-3 pr-8 pb-0 pl-[22px] text-[15.5px] text-ink-textMid leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
        ))}
        <P>
          Nguyên tắc nhớ nhanh: effect nào <em>mở</em> thứ gì, cleanup phải <em>đóng</em> đúng thứ đó.
        </P>
      </Section>

      {/* Cuối trang: đánh dấu đã đọc + bài tiếp theo */}
      <div className="flex items-stretch mt-[30px] border-t border-ink-border">
        <span
          style={{ width: MARGIN_W }}
          className="shrink-0 flex items-center justify-center font-mono text-[11px] text-ink-textDim"
        >
          hết
        </span>
        <div className="flex-1 border-l border-ink-marginLn py-[18px] pr-8 pl-[22px] flex items-center gap-3 flex-wrap">
          <button
            onClick={() => markDone(active.id)}
            className={`vd-focusable inline-flex items-center gap-2 px-[18px] py-2.5 cursor-pointer text-sm font-semibold ${
              isRead ? 'bg-none text-ink-accent border border-ink-accent' : 'text-ink-onAccent border-0 bg-ink-accent'
            }`}
            style={{ borderRadius: R.sm }}
          >
            <CheckCircle2 size={15} />
            {isRead ? 'Đã đọc xong' : 'Đánh dấu đã đọc xong'}
          </button>
          <span className="ml-auto text-[13.5px] text-ink-textMuted">
            Tiếp theo: <span className="text-ink-accent font-medium">useMemo, useCallback &amp; Performance →</span>
          </span>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className={beVietnam.className}>
      <style>{VIBE_GLOBAL_CSS}</style>

      {/* ══ TITLE BAR — tắt đèn cùng căn phòng khi vào focus mode ══ */}
      <div
        style={{ height: TOP_BAR_H }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-7 text-[12.5px] transition-[background,border-color,color] duration-[600ms] ease-in-out ${
          focusMode
            ? 'bg-ink-room border-b border-b-[rgba(244,246,252,0.10)] text-[rgba(244,246,252,0.45)]'
            : 'bg-ink-panel border-b border-ink-border text-ink-textMuted'
        }`}
      >
        <span>Spaces</span>
        <ChevronRight size={11} className={focusMode ? 'text-[rgba(244,246,252,0.25)]' : 'text-ink-textDim'} />
        <span>Lập trình web</span>
        <ChevronRight size={11} className={focusMode ? 'text-[rgba(244,246,252,0.25)]' : 'text-ink-textDim'} />
        <span className={`font-medium ${focusMode ? 'text-[rgba(244,246,252,0.85)]' : 'text-ink-text'}`}>{active.chapter}</span>

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
            title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn trang đọc'}
            className={`vd-focusable w-[26px] h-[26px] flex items-center justify-center cursor-pointer shrink-0 border ${
              focusMode ? 'bg-[rgba(143,166,238,0.14)] border-ink-accentScreen text-ink-accentScreen' : 'bg-none border-ink-border text-ink-textMid'
            }`}
            style={{ borderRadius: R.sm }}
          >
            {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>

        {/* VỆT MỰC ĐỌC — chữ ký của trang: tiến độ cuộn chảy dưới top bar */}
        <div
          style={{ width: `${readPct}%` }}
          className={`absolute left-0 -bottom-px h-0.5 transition-[width] duration-150 ease-linear ${focusMode ? 'bg-ink-accentScreen' : 'bg-ink-accent'}`}
        />
      </div>

      {/* ══ WORKSPACE ══ */}
      <div
        style={{ top: TOP_BAR_H }}
        className={`fixed left-0 right-0 bottom-0 z-[1] flex justify-center transition-[background] duration-[600ms] ease-in-out ${focusMode ? 'bg-ink-room' : 'bg-ink-page'}`}
      >
        <div
          className="w-full h-full grid"
          style={{
            padding: isCompact ? '0 16px' : '0 32px',
            gridTemplateColumns: (focusMode || isCompact) ? '1fr' : '1fr 340px',
            gap: isCompact ? 16 : 36,
          }}
        >

          {/* ══ LEFT COLUMN — trang đọc. Cột LUÔN cuộn vì bài đọc dài theo nội dung. ══ */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="relative flex flex-col h-full overflow-y-auto pb-12 justify-start cs-scrollbar"
          >
            {!focusMode && (
              <div className="shrink-0 pt-[18px] pb-3.5">
                <h1 className="text-[clamp(19px,2.1vw,26px)] font-bold tracking-[-0.015em] leading-[1.25] m-0 text-ink-text">
                  {active.title}
                </h1>
              </div>
            )}

            <div className="shrink-0 relative" style={{ paddingTop: focusMode ? 40 : 0 }}>
              {renderArticle()}

              {/* ── FOCUS MODE: overlay panel + trigger (như bản video) ── */}
              {focusMode && (
                <>
                  <div
                    style={{
                      top: TOP_BAR_H,
                      borderRadius: R.lg,
                      boxShadow: '0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
                      opacity: overlayOpen ? 1 : 0,
                      transform: overlayOpen ? 'translateX(0)' : 'translateX(12px)',
                      pointerEvents: overlayOpen ? 'auto' : 'none',
                    }}
                    className="fixed right-6 bottom-6 z-30 mt-6 w-[min(400px,86vw)] flex flex-col bg-ink-panel border border-ink-border overflow-hidden transition-[opacity,transform] duration-200 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="flex-1">{renderTabs()}</div>
                      <button
                        onClick={() => setOverlayOpen(false)}
                        aria-label="Ẩn overlay"
                        className="vd-focusable shrink-0 bg-none border-0 cursor-pointer text-ink-textDim px-3.5 flex items-center border-b border-ink-border h-full"
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
                    className="vd-focusable fixed right-6 bottom-6 z-20 flex items-center gap-2 py-[9px] px-4 bg-ink-panel border-0 text-[12.5px] font-medium text-ink-textMid transition-opacity duration-150 ease-in-out"
                    style={{
                      borderRadius: R.sm,
                      boxShadow: '0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
                      opacity: overlayOpen ? 0 : 1,
                      pointerEvents: overlayOpen ? 'none' : 'auto',
                    }}
                  >
                    <ListVideo size={13} />
                    <StickyNote size={13} />
                    <span>{done}/{lessons.length} · {notes.length} ghi chú</span>
                  </button>
                </>
              )}
            </div>

            {/* Compact & không focus: tab xếp dưới trang đọc */}
            {isCompact && !focusMode && (
              <div
                style={{ borderRadius: R.md, boxShadow: '0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)' }}
                className="shrink-0 mt-4 min-h-[360px] flex flex-col bg-ink-panel border border-ink-border overflow-hidden"
              >
                {renderTabs()}
                <div className="flex flex-col min-h-[320px]">
                  {panelTab === 'playlist' ? renderPlaylist() : renderNotes()}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT — rail cố định ══ */}
          {!focusMode && !isCompact && (
            <div
              style={{ borderRadius: R.md, boxShadow: '0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)' }}
              className="flex flex-col h-[calc(100%-30px)] mt-[30px] overflow-hidden bg-ink-panel border border-ink-border"
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
