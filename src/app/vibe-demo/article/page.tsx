'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Maximize2, Minimize2, ListVideo, StickyNote, Plus } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

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

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
// "Mực xanh trên giấy trắng" — cùng hệ token với /vibe-demo (bản video).
// Stage của bản article là TRANG SÁCH: một cột chữ dài trên giấy trắng,
// mục (§) đánh số trong lề, code và trích dẫn cũng nằm theo ngữ pháp lề vở.
// Chữ ký riêng của trang: VỆT MỰC ĐỌC — thanh mực mảnh ngay dưới top bar
// chảy dài theo tiến độ cuộn, như bút chì kẻ đến đâu đọc đến đó.
const T = {
  page:    '#FAFAF7',
  room:    '#1A1C22', // phòng tắt đèn — nền focus mode
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
  accentScreen: '#8FA6EE', // bản sáng của accent — chỉ dùng trên nền tối (top bar focus)
  codeBg:  'rgba(33,38,51,0.045)',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

type PanelTab = 'playlist' | 'notes';

const TOP_BAR_H = 52;
const R = { sm: 6, md: 12, lg: 16 };
const MARGIN_W = 56;

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
          §{activeSection + 1}
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.marginLn}` }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ghi chú cho mục đang đọc…"
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
              {n.anchor}
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

  /* ── Các khối văn bản theo ngữ pháp lề vở ── */
  const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div ref={el => { sectionRefs.current[n - 1] = el; }}>
      <div style={{ display: 'flex', alignItems: 'stretch', paddingTop: 30 }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 4,
          fontFamily: T.mono, fontSize: 12, fontWeight: 600,
          color: activeSection === n - 1 ? T.accent : T.inkDim,
          transition: 'color 200ms',
        }}>
          §{n}
        </span>
        <h2 style={{
          flex: 1, borderLeft: `1px solid ${T.marginLn}`,
          padding: '0 32px 0 22px', margin: 0,
          fontFamily: T.sans, fontSize: 19, fontWeight: 700,
          letterSpacing: '-0.01em', color: T.ink, lineHeight: 1.4,
        }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );

  const P = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <span style={{ width: MARGIN_W, flexShrink: 0 }} />
      <p style={{
        flex: 1, borderLeft: `1px solid ${T.marginLn}`,
        padding: '12px 32px 4px 22px', margin: 0,
        fontFamily: T.sans, fontSize: 16, fontWeight: 400,
        color: T.inkMid, lineHeight: 1.75,
      }}>
        {children}
      </p>
    </div>
  );

  const Code = ({ code }: { code: string }) => (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <span style={{
        width: MARGIN_W, flexShrink: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 22,
        fontFamily: T.mono, fontSize: 11, color: T.inkDim,
      }}>
        {'</>'}
      </span>
      <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '14px 32px 4px 22px' }}>
        <pre style={{
          margin: 0, padding: '16px 18px',
          background: T.codeBg, borderRadius: R.sm,
          border: `1px solid ${T.border}`,
          fontFamily: T.mono, fontSize: 13, lineHeight: 1.65,
          color: T.ink, overflowX: 'auto',
        }}>
          {code}
        </pre>
      </div>
    </div>
  );

  const Quote = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <span style={{
        width: MARGIN_W, flexShrink: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 16,
        fontFamily: T.sans, fontSize: 22, fontWeight: 700, color: T.accent,
        lineHeight: 1,
      }}>
        “
      </span>
      <div style={{
        flex: 1, borderLeft: `2px solid ${T.accent}`,
        padding: '14px 32px 6px 22px',
        fontFamily: T.sans, fontSize: 16.5, fontStyle: 'italic', fontWeight: 500,
        color: T.ink, lineHeight: 1.7,
      }}>
        {children}
      </div>
    </div>
  );

  /* ── Trang sách — stage của bản article ── */
  const renderArticle = () => (
    <div style={{
      width: 'min(100%, 720px)',
      margin: '0 auto',
      background: T.panel,
      border: `1px solid ${T.border}`,
      borderRadius: R.lg,
      boxShadow: T.shadowMd,
      overflow: 'hidden',
    }}>
      {/* Đầu trang */}
      <div style={{ display: 'flex', alignItems: 'stretch', paddingTop: 34 }}>
        <span style={{ width: MARGIN_W, flexShrink: 0 }} />
        <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 32px 22px 22px' }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.inkMuted, marginBottom: 8,
          }}>
            <span>Bài đọc</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim }}>{active.duration}</span>
            <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 11, color: readPct >= 100 ? T.accent : T.inkDim }}>
              đã đọc {readPct}%
            </span>
          </div>
          <div style={{
            fontFamily: T.sans, fontSize: 26, fontWeight: 700,
            letterSpacing: '-0.015em', color: T.ink, lineHeight: 1.3,
          }}>
            Hooks: tư duy đúng về state và effect
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 15.5, color: T.inkMuted, marginTop: 10, lineHeight: 1.65 }}>
            Bốn hiểu lầm phổ biến nhất khi mới học useState và useEffect — và mô hình
            tư duy thay thế cho từng cái.
          </div>
        </div>
      </div>

      <Section n={1} title="State là ảnh chụp, không phải biến">
        <P>
          Mỗi lần render, component của bạn nhận một <em>ảnh chụp</em> state tại thời điểm đó.
          Mọi biến, mọi hàm, mọi closure trong lần render ấy đều nhìn thấy đúng bản chụp này —
          không phải &quot;giá trị mới nhất&quot;. Đây là lý do một <code style={{ fontFamily: T.mono, fontSize: 14 }}>setTimeout</code> đặt
          trong render cũ vẫn in ra giá trị cũ: nó đóng gói theo ảnh chụp của lần render đã tạo ra nó.
        </P>
        <P>
          Khi chấp nhận mô hình này, hàng loạt &quot;bug khó hiểu&quot; trở thành hành vi hiển nhiên:
          không phải React quên cập nhật, mà là bạn đang đọc một tấm ảnh cũ.
        </P>
      </Section>

      <Section n={2} title="setState là lời hẹn, không phải lệnh gán">
        <P>
          Gọi <code style={{ fontFamily: T.mono, fontSize: 14 }}>setCount(count + 1)</code> không đổi
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
          <div key={m} style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{
              width: MARGIN_W, flexShrink: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 14,
              fontFamily: T.mono, fontSize: 11, color: T.inkDim,
            }}>
              {m}
            </span>
            <div style={{
              flex: 1, borderLeft: `1px solid ${T.marginLn}`,
              padding: '12px 32px 0 22px',
              fontFamily: T.sans, fontSize: 15.5, color: T.inkMid, lineHeight: 1.7,
            }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
        ))}
        <P>
          Nguyên tắc nhớ nhanh: effect nào <em>mở</em> thứ gì, cleanup phải <em>đóng</em> đúng thứ đó.
        </P>
      </Section>

      {/* Cuối trang: đánh dấu đã đọc + bài tiếp theo */}
      <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 30, borderTop: `1px solid ${T.border}` }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.mono, fontSize: 11, color: T.inkDim,
        }}>
          hết
        </span>
        <div style={{
          flex: 1, borderLeft: `1px solid ${T.marginLn}`,
          padding: '18px 32px 18px 22px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <button
            onClick={() => markDone(active.id)}
            className="vd-focusable"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: isRead ? 'none' : T.accent,
              color: isRead ? T.accent : T.onAccent,
              border: isRead ? `1px solid ${T.accent}` : 'none',
              borderRadius: R.sm, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 14, fontWeight: 600,
            }}
          >
            <CheckCircle2 size={15} />
            {isRead ? 'Đã đọc xong' : 'Đánh dấu đã đọc xong'}
          </button>
          <span style={{ marginLeft: 'auto', fontFamily: T.sans, fontSize: 13.5, color: T.inkMuted }}>
            Tiếp theo: <span style={{ color: T.accent, fontWeight: 500 }}>useMemo, useCallback &amp; Performance →</span>
          </span>
        </div>
      </div>
    </div>
  );

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

      {/* ══ TITLE BAR — tắt đèn cùng căn phòng khi vào focus mode ══ */}
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
            title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn trang đọc'}
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

        {/* VỆT MỰC ĐỌC — chữ ký của trang: tiến độ cuộn chảy dưới top bar */}
        <div style={{
          position: 'absolute', left: 0, bottom: -1, height: 2,
          width: `${readPct}%`,
          background: focusMode ? T.accentScreen : T.accent,
          transition: 'width 150ms linear',
        }} />
      </div>

      {/* ══ WORKSPACE ══ */}
      <div style={{
        position: 'fixed',
        top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        zIndex: 1,
        display: 'flex', justifyContent: 'center',
        background: focusMode ? T.room : T.page,
        transition: 'background 600ms ease',
      }}>
        <div style={{
          width: '100%',
          padding: isCompact ? '0 16px' : '0 32px',
          display: 'grid',
          gridTemplateColumns: (focusMode || isCompact) ? '1fr' : '1fr 340px',
          gap: isCompact ? 16 : 36,
          height: '100%',
        }}>

          {/* ══ LEFT COLUMN — trang đọc. Cột LUÔN cuộn vì bài đọc dài theo nội dung. ══ */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              position: 'relative', display: 'flex', flexDirection: 'column',
              height: '100%',
              overflowY: 'auto',
              paddingBottom: 48,
              justifyContent: 'flex-start',
            }}
            className="cs-scrollbar"
          >
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

            <div style={{ flexShrink: 0, position: 'relative', paddingTop: focusMode ? 40 : 0 }}>
              {renderArticle()}

              {/* ── FOCUS MODE: overlay panel + trigger (như bản video) ── */}
              {focusMode && (
                <>
                  <div style={{
                    position: 'fixed',
                    top: TOP_BAR_H, right: 24, bottom: 24, zIndex: 30,
                    marginTop: 24,
                    width: 'min(400px, 86vw)',
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
                      position: 'fixed', right: 24, bottom: 24, zIndex: 20,
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
                  </button>
                </>
              )}
            </div>

            {/* Compact & không focus: tab xếp dưới trang đọc */}
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

          {/* ══ RIGHT — rail cố định ══ */}
          {!focusMode && !isCompact && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              height: 'calc(100% - 30px)', marginTop: 30,
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
