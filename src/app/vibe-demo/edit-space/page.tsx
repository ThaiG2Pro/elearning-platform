'use client';

import React, { useState } from 'react';
import {
  ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Play, HelpCircle, BookOpen,
  Pencil, Check, Eye, EyeOff, GripVertical,
} from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

/* ─── Data ──────────────────────────────────────────────────────────────── */
type LessonType = 'video' | 'quiz' | 'article';

interface LessonDraft {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  published: boolean; // false = bản thảo (viền chì đứt nét), true = đã đăng (viền mực liền)
}

interface ChapterDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

const INITIAL_CHAPTERS: ChapterDraft[] = [
  {
    id: 'c1', title: 'Nền tảng React 18',
    lessons: [
      { id: 'l01', title: 'Virtual DOM & Reconciliation',       type: 'video',   duration: '14:20',  published: true  },
      { id: 'l02', title: 'App Router, JSX & Component Model', type: 'video',   duration: '22:15',  published: true  },
      { id: 'l03', title: 'Quiz — Nền tảng React',              type: 'quiz',    duration: '10 câu', published: true  },
    ],
  },
  {
    id: 'c2', title: 'Hooks & State',
    lessons: [
      { id: 'l04', title: 'Bài đọc — Hooks: tư duy đúng',       type: 'article', duration: '8 phút', published: true  },
      { id: 'l05', title: 'useMemo, useCallback & Performance', type: 'video',   duration: '35:10',  published: false },
      { id: 'l06', title: 'Custom Hooks Pattern',               type: 'video',   duration: '19:50',  published: false },
    ],
  },
  {
    id: 'c3', title: 'Async & Server Components',
    lessons: [
      { id: 'l07', title: 'TanStack Query & REST API',          type: 'video',   duration: '',       published: false },
    ],
  },
];

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
// "Mực xanh trên giấy trắng" — cùng hệ token với bản video/quiz/article.
// Chữ ký của TRANG SOẠN: một không gian không có "phòng tắt đèn" (không có
// nội dung để tiêu thụ, chỉ có cấu trúc để dựng) — thay vào đó là ẩn dụ
// BẢN THẢO: mục nháp viền CHÌ đứt nét (inkDim, dashed) như phác trước khi hạ
// bút, mục đã đăng viền MỰC liền nét (accent, solid) — cùng một hành động
// "hạ mực" mà học viên đã thấy trong hiệu ứng vd-ink-in ở các trang kia.
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
  marginLn:'rgba(46,74,158,0.30)',
  onAccent:'#FFFFFF',
  pencilLn:'rgba(33,38,51,0.30)', // viền chì — mục bản thảo, chưa đăng
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

const TOP_BAR_H = 52;
const R = { sm: 6, md: 12, lg: 16 };
const MARGIN_W = 56;

const TYPE_META: Record<LessonType, { label: string; icon: React.ReactNode }> = {
  video:   { label: 'Video',    icon: <Play size={13} /> },
  quiz:    { label: 'Quiz',     icon: <HelpCircle size={13} /> },
  article: { label: 'Bài đọc',  icon: <BookOpen size={13} /> },
};

let uid = 100;
const nextId = (prefix: string) => `${prefix}${uid++}`;

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

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeEditSpaceDemoPage() {
  const [spaceTitle, setSpaceTitle] = useState('Lập trình web hiện đại');
  const [spaceDesc, setSpaceDesc]   = useState(
    'Từ nền tảng React đến kiến trúc App Router — 8 bài giảng, 1 bài kiểm tra, 1 bài đọc.'
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [chapters, setChapters]     = useState<ChapterDraft[]>(INITIAL_CHAPTERS);
  const [savedTick, setSavedTick]   = useState<number | null>(null);
  const isCompact = useIsCompact(980);

  const lessonCount    = chapters.reduce((s, c) => s + c.lessons.length, 0);
  const publishedCount = chapters.reduce((s, c) => s + c.lessons.filter(l => l.published).length, 0);
  const draftCount     = lessonCount - publishedCount;

  const save = () => setSavedTick(Date.now());

  const updateChapter = (id: string, patch: Partial<ChapterDraft>) =>
    setChapters(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));

  const updateLesson = (chId: string, lId: string, patch: Partial<LessonDraft>) =>
    setChapters(cs => cs.map(c => c.id !== chId ? c : {
      ...c, lessons: c.lessons.map(l => l.id === lId ? { ...l, ...patch } : l),
    }));

  const moveChapter = (id: string, dir: -1 | 1) =>
    setChapters(cs => {
      const i = cs.findIndex(c => c.id === id);
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const moveLesson = (chId: string, lId: string, dir: -1 | 1) =>
    setChapters(cs => cs.map(c => {
      if (c.id !== chId) return c;
      const i = c.lessons.findIndex(l => l.id === lId);
      const j = i + dir;
      if (j < 0 || j >= c.lessons.length) return c;
      const lessons = [...c.lessons];
      [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
      return { ...c, lessons };
    }));

  const addChapter = () =>
    setChapters(cs => [...cs, { id: nextId('c'), title: '', lessons: [] }]);

  const removeChapter = (id: string) =>
    setChapters(cs => cs.filter(c => c.id !== id));

  const addLesson = (chId: string) =>
    setChapters(cs => cs.map(c => c.id !== chId ? c : {
      ...c, lessons: [...c.lessons, { id: nextId('l'), title: '', type: 'video', duration: '', published: false }],
    }));

  const removeLesson = (chId: string, lId: string) =>
    setChapters(cs => cs.map(c => c.id !== chId ? c : {
      ...c, lessons: c.lessons.filter(l => l.id !== lId),
    }));

  /* ── Một dòng bài học trong bản thảo: viền chì đứt / mực liền theo trạng thái ── */
  const renderLessonRow = (chapter: ChapterDraft, lesson: LessonDraft, idx: number, total: number) => (
    <div key={lesson.id} className="vd-row" style={{ display: 'flex', alignItems: 'stretch' }}>
      <span style={{
        width: MARGIN_W, flexShrink: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 13,
        fontFamily: T.mono, fontSize: 11,
        color: lesson.published ? T.accent : T.inkDim,
      }}>
        {String(idx + 1).padStart(2, '0')}
      </span>

      <div style={{
        flex: 1, minWidth: 0,
        borderLeft: `${lesson.published ? '1px solid' : '1.5px dashed'} ${lesson.published ? T.marginLn : T.pencilLn}`,
        padding: '9px 8px 9px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Loại bài — bấm để đổi vòng vòng video → quiz → article */}
        <button
          onClick={() => updateLesson(chapter.id, lesson.id, {
            type: lesson.type === 'video' ? 'quiz' : lesson.type === 'quiz' ? 'article' : 'video',
          })}
          title={`Loại: ${TYPE_META[lesson.type].label} — bấm để đổi`}
          className="vd-focusable"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            background: T.accentA, border: 'none', borderRadius: R.sm,
            padding: '6px 9px', cursor: 'pointer', color: T.accent,
            fontFamily: T.sans, fontSize: 11.5, fontWeight: 500,
          }}
        >
          {TYPE_META[lesson.type].icon}
          {!isCompact && TYPE_META[lesson.type].label}
        </button>

        <input
          value={lesson.title}
          onChange={e => updateLesson(chapter.id, lesson.id, { title: e.target.value })}
          placeholder="Tên bài học…"
          className="vd-focusable"
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: T.sans, fontSize: 14.5, fontWeight: 500, color: T.ink,
            padding: '6px 4px', caretColor: T.accent,
          }}
        />

        {!isCompact && (
          <input
            value={lesson.duration}
            onChange={e => updateLesson(chapter.id, lesson.id, { duration: e.target.value })}
            placeholder="thời lượng"
            className="vd-focusable"
            style={{
              width: 76, flexShrink: 0, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: T.mono, fontSize: 11.5, color: T.inkMuted, textAlign: 'right',
              padding: '6px 2px', caretColor: T.accent,
            }}
          />
        )}

        {/* Trạng thái: bản thảo (chì) ↔ đã đăng (mực) */}
        <button
          onClick={() => updateLesson(chapter.id, lesson.id, { published: !lesson.published })}
          title={lesson.published ? 'Đã đăng — bấm để chuyển về bản thảo' : 'Bản thảo — bấm để hạ mực, đăng bài'}
          className="vd-focusable"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: `1px solid ${lesson.published ? T.accent : T.pencilLn}`,
            borderRadius: R.sm, padding: '6px 9px', cursor: 'pointer',
            color: lesson.published ? T.accent : T.inkMuted,
            fontFamily: T.sans, fontSize: 11.5, fontWeight: 500,
          }}
        >
          {lesson.published ? <Check size={12} /> : <Pencil size={12} />}
          {!isCompact && (lesson.published ? 'Đã đăng' : 'Bản thảo')}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <button
            onClick={() => moveLesson(chapter.id, lesson.id, -1)}
            disabled={idx === 0}
            aria-label="Di chuyển lên"
            className="vd-focusable"
            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? T.inkDim : T.inkMuted, padding: 0, lineHeight: 0 }}
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => moveLesson(chapter.id, lesson.id, 1)}
            disabled={idx === total - 1}
            aria-label="Di chuyển xuống"
            className="vd-focusable"
            style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', color: idx === total - 1 ? T.inkDim : T.inkMuted, padding: 0, lineHeight: 0 }}
          >
            <ChevronDown size={13} />
          </button>
        </div>

        <button
          onClick={() => removeLesson(chapter.id, lesson.id)}
          aria-label="Xóa bài học"
          className="vd-focusable"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: T.inkDim, padding: '4px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.inkMuted; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.inkDim; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  /* ── Một chương: tiêu đề + danh sách bài + dòng "thêm bài" đứt nét ── */
  const renderChapter = (chapter: ChapterDraft, ci: number) => (
    <div key={chapter.id} style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
      boxShadow: T.shadowSm, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
        <GripVertical size={14} style={{ color: T.inkDim, flexShrink: 0 }} />
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, flexShrink: 0 }}>
          Chương {String(ci + 1).padStart(2, '0')}
        </span>
        <input
          value={chapter.title}
          onChange={e => updateChapter(chapter.id, { title: e.target.value })}
          placeholder="Tên chương…"
          className="vd-focusable"
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.ink,
            padding: '4px', caretColor: T.accent,
          }}
        />
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, flexShrink: 0 }}>
          {chapter.lessons.length} bài
        </span>
        <button
          onClick={() => moveChapter(chapter.id, -1)}
          disabled={ci === 0}
          aria-label="Chương lên"
          className="vd-focusable"
          style={{ background: 'none', border: 'none', cursor: ci === 0 ? 'default' : 'pointer', color: ci === 0 ? T.inkDim : T.inkMuted, padding: 2, lineHeight: 0 }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={() => moveChapter(chapter.id, 1)}
          disabled={ci === chapters.length - 1}
          aria-label="Chương xuống"
          className="vd-focusable"
          style={{ background: 'none', border: 'none', cursor: ci === chapters.length - 1 ? 'default' : 'pointer', color: ci === chapters.length - 1 ? T.inkDim : T.inkMuted, padding: 2, lineHeight: 0 }}
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={() => removeChapter(chapter.id)}
          aria-label="Xóa chương"
          className="vd-focusable"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkDim, padding: 4 }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ padding: '4px 0' }}>
        {chapter.lessons.map((l, li) => renderLessonRow(chapter, l, li, chapter.lessons.length))}

        {/* Dòng thêm bài — viền chì đứt nét, đúng ngôn ngữ "phác trước khi viết" */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <span style={{ width: MARGIN_W, flexShrink: 0 }} />
          <button
            onClick={() => addLesson(chapter.id)}
            className="vd-focusable"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              margin: '4px 12px 8px 0',
              borderLeft: `1.5px dashed ${T.pencilLn}`,
              background: 'none', border: 'none', borderLeftStyle: 'dashed',
              padding: '9px 12px 9px 14px', cursor: 'pointer',
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, color: T.inkMuted,
              borderRadius: R.sm,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.inkMuted; }}
          >
            <Plus size={14} />
            Thêm bài học
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Panel bên phải: thông tin không gian học ── */
  const renderPropertiesPanel = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20,
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: R.md,
      boxShadow: T.shadowSm, padding: 20,
    }}>
      <div>
        <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 8 }}>
          Ảnh bìa
        </div>
        <div style={{
          width: '100%', aspectRatio: '16/9', borderRadius: R.sm,
          background: 'linear-gradient(135deg, #2E4A9E 0%, #4A63B8 60%, #8FA6EE 100%)',
          border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
        }}>
          Xem trước ảnh bìa
        </div>
      </div>

      <div>
        <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 8 }}>
          Tên không gian
        </div>
        <input
          value={spaceTitle}
          onChange={e => setSpaceTitle(e.target.value)}
          className="vd-focusable"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: T.page, border: `1px solid ${T.border}`, borderRadius: R.sm,
            padding: '10px 12px', fontFamily: T.sans, fontSize: 15, fontWeight: 600, color: T.ink,
            caretColor: T.accent,
          }}
        />
      </div>

      <div>
        <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 8 }}>
          Giới thiệu ngắn
        </div>
        <textarea
          value={spaceDesc}
          onChange={e => setSpaceDesc(e.target.value)}
          rows={3}
          className="vd-focusable"
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            background: T.page, border: `1px solid ${T.border}`, borderRadius: R.sm,
            padding: '10px 12px', fontFamily: T.sans, fontSize: 13.5, color: T.inkMid, lineHeight: 1.6,
            caretColor: T.accent,
          }}
        />
      </div>

      <div>
        <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginBottom: 8 }}>
          Hiển thị
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { key: 'private' as const, label: 'Riêng tư', icon: <EyeOff size={13} /> },
            { key: 'public'  as const, label: 'Công khai', icon: <Eye size={13} /> },
          ]).map(opt => {
            const isActive = visibility === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setVisibility(opt.key)}
                className="vd-focusable"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 10px', cursor: 'pointer',
                  background: isActive ? T.accentA : 'none',
                  border: `1px solid ${isActive ? T.accent : T.border}`, borderRadius: R.sm,
                  color: isActive ? T.accent : T.inkMuted,
                  fontFamily: T.sans, fontSize: 13, fontWeight: 500,
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: String(chapters.length), label: 'chương' },
          { n: String(lessonCount),     label: 'bài học tổng' },
          { n: String(publishedCount),  label: 'đã đăng (mực)' },
          { n: String(draftCount),      label: 'còn ở bản thảo (chì)' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.accent, width: 20 }}>{row.n}</span>
            <span style={{ fontFamily: T.sans, fontSize: 13, color: T.inkMuted }}>{row.label}</span>
          </div>
        ))}
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
        .vd-row { transition: background 120ms; }
        .vd-row:hover { background: rgba(33,38,51,0.02); }
        @keyframes vd-ink-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vd-ink-in { animation: vd-ink-in 400ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .vd-ink-in { animation: none; }
        }
      `}</style>

      {/* ══ TOP BAR ══ */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: TOP_BAR_H,
        zIndex: 50,
        background: T.panel,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 8,
        fontFamily: T.sans, fontSize: 12.5,
        color: T.inkMuted,
      }}>
        <span>Spaces</span>
        <ChevronRight size={11} style={{ color: T.inkDim }} />
        <span>Soạn không gian học tập</span>
        <ChevronRight size={11} style={{ color: T.inkDim }} />
        <span style={{ color: T.ink, fontWeight: 500 }}>{spaceTitle || 'Chưa đặt tên'}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {savedTick && (
            <span key={savedTick} className="vd-ink-in" style={{ fontFamily: T.mono, fontSize: 11.5, color: T.accent }}>
              đã lưu
            </span>
          )}
          <button
            onClick={save}
            className="vd-focusable"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px',
              background: T.accent, color: T.onAccent,
              border: 'none', borderRadius: R.sm, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 13, fontWeight: 600,
            }}
          >
            Lưu bản thảo
          </button>
        </div>
      </div>

      {/* ══ WORKSPACE ══ */}
      <div style={{
        position: 'fixed',
        top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        zIndex: 1,
        display: 'flex', justifyContent: 'center',
        background: T.page,
        overflowY: 'auto',
      }} className="cs-scrollbar">
        <div style={{
          width: '100%', maxWidth: 1240,
          padding: isCompact ? '20px 16px 48px' : '28px 32px 56px',
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : 'minmax(0,1fr) 320px',
          gap: isCompact ? 20 : 32,
          alignItems: 'start',
        }}>
          {/* ══ LEFT — bản thảo cấu trúc khóa học ══ */}
          <div>
            <h1 style={{
              fontFamily: T.sans, fontSize: 'clamp(19px, 2.1vw, 24px)', fontWeight: 700,
              letterSpacing: '-0.015em', color: T.ink, margin: '0 0 4px',
            }}>
              Cấu trúc bài học
            </h1>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.inkMuted, margin: '0 0 20px', lineHeight: 1.6 }}>
              Mục viền chì đứt nét là bản thảo — chỉ học viên xem trước mới thấy. Bấm{' '}
              <Pencil size={11} style={{ display: 'inline', verticalAlign: -1, color: T.inkMuted }} /> để hạ mực và đăng bài.
            </p>

            {chapters.map((c, ci) => renderChapter(c, ci))}

            <button
              onClick={addChapter}
              className="vd-focusable"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 0',
                background: 'none', border: `1.5px dashed ${T.pencilLn}`, borderRadius: R.md,
                cursor: 'pointer',
                fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.inkMuted,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.accent; (e.currentTarget as HTMLElement).style.borderColor = T.accent; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.inkMuted; (e.currentTarget as HTMLElement).style.borderColor = T.pencilLn; }}
            >
              <Plus size={15} />
              Thêm chương
            </button>
          </div>

          {/* ══ RIGHT — thông tin không gian ══ */}
          <div style={{ position: isCompact ? 'static' : 'sticky', top: 0 }}>
            {renderPropertiesPanel()}
          </div>
        </div>
      </div>
    </>
  );
}
