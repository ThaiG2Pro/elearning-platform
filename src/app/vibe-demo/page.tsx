'use client';

import React, { useState, useRef } from 'react';
import { CheckCircle2, Circle, Plus, ChevronRight } from 'lucide-react';

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
const T = {
  bg:    '#0D1117',
  line:  'rgba(255,255,255,0.07)',
  white: 'rgba(255,255,255,0.88)',
  mid:   'rgba(255,255,255,0.45)',
  muted: 'rgba(255,255,255,0.28)',
  dim:   'rgba(255,255,255,0.10)',
  green: '#3FB950',
  greenA:'rgba(63,185,80,0.10)',
  mono:  "'JetBrains Mono','Fira Code',monospace",
  sans:  "'Inter',system-ui,sans-serif",
} as const;

const TOP_BAR_H = 40; // px

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeDemoPage() {
  const [lessons, setLessons]   = useState<Lesson[]>(LESSONS);
  const [activeId, setActiveId] = useState('l04');
  const [playing, setPlaying]   = useState(false);
  const [notes, setNotes]       = useState<Note[]>(INITIAL_NOTES);
  const [draft, setDraft]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const active = lessons.find(l => l.id === activeId)!;
  const idx    = lessons.findIndex(l => l.id === activeId);
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

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ══ 1. TOP BAR — fixed, luôn hiện dù cuộn bao nhiêu ══════════════ */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: TOP_BAR_H,
        zIndex: 50,
        borderBottom: `1px solid ${T.line}`,
        background: T.bg,                      // phải solid — không bị content thấu qua
        display: 'flex', alignItems: 'center',
        padding: '0 32px', gap: 8,
        fontFamily: T.mono, fontSize: 11, color: T.muted,
      }}>
        <span>~/spaces</span>
        <ChevronRight size={10} style={{ color: T.dim }} />
        <span style={{ color: T.mid }}>lap-trinh-web</span>
        <ChevronRight size={10} style={{ color: T.dim }} />
        <span style={{ color: T.white }}>{active.chapter}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 80, height: 2, background: T.line, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: T.green, transition: 'width 400ms ease' }} />
          </div>
          <span style={{ color: T.green }}>{pct}%</span>
        </div>
      </div>

      {/* ══ 2. BODY — bắt đầu sau top bar, chiếm toàn bộ viewport còn lại ═ */}
      <div style={{
        position: 'fixed',
        top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        background: T.bg,
      }}>
        {/* Inner grid: max 1440px, 32px margins */}
        <div style={{
          width: '100%',
          maxWidth: 1440,
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          height: '100%',
        }}>

          {/* ══ LEFT COLUMN — flex column, split into two scroll zones ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── TOP ZONE: Video + meta + title + note input — FIXED, không cuộn ── */}
            <div style={{ flexShrink: 0, paddingTop: 28 }}>

              {/* Meta */}
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, marginBottom: 9 }}>
                {String(idx + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(lessons.length).padStart(2, '0')}
                &nbsp;&nbsp;·&nbsp;&nbsp;{active.chapter}
                &nbsp;&nbsp;·&nbsp;&nbsp;{active.duration}
              </div>

              {/* Title */}
              <h1 style={{
                fontFamily: T.sans, fontSize: 24, fontWeight: 600,
                letterSpacing: '-0.025em', lineHeight: 1.2,
                margin: '0 0 20px 0', color: T.white,
              }}>
                {active.title}
              </h1>

              {/* Video player */}
              <div style={{
                width: '100%', aspectRatio: '16/9',
                background: '#010409',
                border: `1px solid ${T.line}`, borderRadius: 6,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={() => setPlaying(v => !v)}
                    style={{
                      width: 52, height: 52, borderRadius: '50%',
                      border: 'none', background: T.green, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'opacity 150ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1';   }}
                  >
                    {playing
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#0D1117"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="#0D1117" style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21"/></svg>
                    }
                  </button>
                </div>
                {/* Scrubber */}
                <div style={{
                  height: 36, borderTop: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
                  fontFamily: T.mono, fontSize: 11, color: T.muted, flexShrink: 0,
                }}>
                  <span>11:42</span>
                  <div style={{ flex: 1, height: 2, background: T.dim, borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ width: '42%', height: '100%', background: T.green }} />
                  </div>
                  <span>{active.duration}</span>
                  <span style={{ color: T.green, marginLeft: 8 }}>✓ saved</span>
                </div>
              </div>

              {/* Note input — dính liền dưới video, luôn hiện */}
              <form
                onSubmit={addNote}
                style={{
                  display: 'flex', alignItems: 'center',
                  borderTop: `1px solid ${T.line}`,
                  borderBottom: `1px solid ${T.line}`,
                  marginTop: -1,
                }}
              >
                <span style={{
                  fontFamily: T.mono, fontSize: 11, color: T.green,
                  padding: '9px 14px', borderRight: `1px solid ${T.line}`,
                  flexShrink: 0, userSelect: 'none',
                }}>
                  11:42
                </span>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="// ghi lại ý quan trọng tại phút này..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: T.mono, fontSize: 12, color: T.white,
                    padding: '9px 14px', caretColor: T.green,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '9px 14px', background: 'none', border: 'none',
                    borderLeft: `1px solid ${T.line}`, cursor: 'pointer',
                    color: T.dim, display: 'flex', alignItems: 'center',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.green; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.dim;   }}
                >
                  <Plus size={13} />
                </button>
              </form>
            </div>

            {/* ── BOTTOM ZONE: Notes list — cuộn độc lập ── */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }} className="cs-scrollbar">
              {notes.length === 0 && (
                <div style={{ padding: '24px 0', fontFamily: T.mono, fontSize: 11, color: T.dim }}>
                  // chưa có ghi chú nào
                </div>
              )}
              {notes.map(n => (
                <div key={n.id} style={{ display: 'flex', borderBottom: `1px solid ${T.line}` }}>
                  <span style={{
                    fontFamily: T.mono, fontSize: 11, color: T.green,
                    padding: '10px 14px', borderRight: `1px solid ${T.line}`,
                    flexShrink: 0, minWidth: 54,
                  }}>
                    {n.time}
                  </span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 12, color: T.mid,
                    padding: '10px 14px', lineHeight: 1.55,
                  }}>
                    {n.text}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* ══ RIGHT SIDEBAR — flex column, header cố định, list cuộn ══ */}
          <div style={{
            borderLeft: `1px solid ${T.line}`,
            display: 'flex', flexDirection: 'column',
            height: '100%', overflow: 'hidden',
          }}>

            {/* ── SIDEBAR HEADER — cố định, không cuộn theo playlist ── */}
            <div style={{
              flexShrink: 0,
              padding: '11px 16px',
              borderBottom: `1px solid ${T.line}`,
              fontFamily: T.mono, fontSize: 10,
              color: T.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex', justifyContent: 'space-between',
              background: T.bg,
            }}>
              <span>Danh sách bài học</span>
              <span style={{ color: T.green }}>{done}/{lessons.length}</span>
            </div>

            {/* ── PLAYLIST — cuộn độc lập trong sidebar ── */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }} className="cs-scrollbar">
              {lessons.map((l, i) => {
                const isActive = l.id === activeId;
                const isDone   = l.status === 'completed';
                const isNext   = l.status === 'not_started' &&
                  lessons.slice(0, i).every(p => p.status === 'completed' || p.id === activeId);

                return (
                  <div
                    key={l.id}
                    role="button"
                    onClick={() => setActiveId(l.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '11px 16px',
                      borderBottom: `1px solid ${T.line}`,
                      cursor: 'pointer',
                      background: isActive ? T.greenA : 'transparent',
                      borderLeft: isActive ? `2px solid ${T.green}` : '2px solid transparent',
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = T.dim; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <button
                      onClick={e => markDone(l.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0 0', flexShrink: 0 }}
                    >
                      {isDone
                        ? <CheckCircle2 size={13} style={{ color: T.green }} />
                        : <Circle       size={13} style={{ color: T.dim   }} />
                      }
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, lineHeight: 1.4,
                        color: isActive ? T.white : isDone ? T.muted : T.mid,
                        fontWeight: isActive ? 500 : 400,
                        textDecoration: isDone ? 'line-through' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {l.title}
                      </div>
                      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginTop: 3, display: 'flex', gap: 8 }}>
                        <span>{l.duration}</span>
                        {isNext && <span style={{ color: T.green }}>tiếp theo →</span>}
                      </div>
                    </div>

                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.dim, flexShrink: 0, paddingTop: 1 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
