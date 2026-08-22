'use client';

import React, { useState } from 'react';
import {
  ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Play, HelpCircle, BookOpen,
  Pencil, Check, Eye, EyeOff, GripVertical,
} from 'lucide-react';
import { beVietnam, R, TOP_BAR_H, MARGIN_W, useIsCompact, VIBE_GLOBAL_CSS } from '@/lib/vibe/theme';

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

const TYPE_META: Record<LessonType, { label: string; icon: React.ReactNode }> = {
  video:   { label: 'Video',    icon: <Play size={13} /> },
  quiz:    { label: 'Quiz',     icon: <HelpCircle size={13} /> },
  article: { label: 'Bài đọc',  icon: <BookOpen size={13} /> },
};

let uid = 100;
const nextId = (prefix: string) => `${prefix}${uid++}`;

/*
 * Chuyển sang Tailwind `ink-*` namespace (tailwind.config.js) thay cho object
 * `T` + style={{}} — cùng pattern đã dùng ở about/page.tsx. Trang này không
 * có modal/dialog hay tab switcher tự vẽ (chỉ có input/button đổi trạng thái
 * tại chỗ) nên không có ứng viên Radix an toàn để hoán đổi.
 *
 * Vẫn giữ style={{}} cho: hằng số runtime dùng chung (TOP_BAR_H, MARGIN_W,
 * R.sm/R.md — bán kính bo góc), boxShadow (T.shadowSm — chưa có trong
 * tailwind.config.js), giá trị phụ thuộc state (isCompact, vị trí sticky),
 * và chuỗi border-left của nút "Thêm bài học" — chuỗi này ghi đè theo ĐÚNG
 * THỨ TỰ thuộc tính gốc (borderLeft → border:'none' → borderLeftStyle) nên
 * giữ nguyên inline để không đổi hiệu ứng cascade thật đang render.
 */
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
    <div key={lesson.id} className="vd-row flex items-stretch">
      <span
        style={{ width: MARGIN_W }}
        className={`shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] ${lesson.published ? 'text-ink-accent' : 'text-ink-textDim'}`}
      >
        {String(idx + 1).padStart(2, '0')}
      </span>

      <div
        className={`flex-1 min-w-0 flex ${isCompact ? 'flex-col gap-1.5' : 'items-center gap-2'} pt-[9px] pb-[9px] pr-2 pl-3.5 ${lesson.published ? 'border-l border-ink-marginLn' : 'border-l-[1.5px] border-dashed border-ink-pencil'}`}
      >
        {/* Mục 2 — bug thật do user test trên iPhone SE: dù đã ẩn nhãn chữ +
            ô thời lượng khi isCompact, TỔNG các nút shrink-0 còn lại (loại
            bài, trạng thái, lên/xuống, xóa) vẫn vượt quá phần còn lại sau
            MARGIN_W — nút xóa (cuối cùng trong hàng) bị đẩy khỏi viewport,
            MẤT HOÀN TOÀN không cách nào bấm được. Cùng nguyên nhân + cùng
            cách sửa như dòng tiêu đề chương: gãy 2 dòng ở màn hẹp thay vì
            nhồi 1 dòng. Dòng 1 = loại bài + tên bài (cần rộng để đọc/sửa
            tên); dòng 2 = trạng thái + lên/xuống + xóa, canh phải. */}
        <div className={`flex items-center gap-2 ${isCompact ? '' : 'flex-1 min-w-0'}`}>
          <button
            onClick={() => updateLesson(chapter.id, lesson.id, {
              type: lesson.type === 'video' ? 'quiz' : lesson.type === 'quiz' ? 'article' : 'video',
            })}
            title={`Loại: ${TYPE_META[lesson.type].label} — bấm để đổi`}
            className="vd-focusable shrink-0 flex items-center gap-[5px] bg-ink-accentA border-none py-1.5 px-[9px] cursor-pointer text-ink-accent text-[11.5px] font-medium"
            style={{ borderRadius: R.sm }}
          >
            {TYPE_META[lesson.type].icon}
            {!isCompact && TYPE_META[lesson.type].label}
          </button>

          <input
            value={lesson.title}
            onChange={e => updateLesson(chapter.id, lesson.id, { title: e.target.value })}
            placeholder="Tên bài học…"
            className="vd-focusable flex-1 min-w-0 bg-transparent border-none outline-none text-[14.5px] font-medium text-ink-text py-1.5 px-1 caret-ink-accent"
          />

          {!isCompact && (
            <input
              value={lesson.duration}
              onChange={e => updateLesson(chapter.id, lesson.id, { duration: e.target.value })}
              placeholder="thời lượng"
              className="vd-focusable w-[76px] shrink-0 bg-transparent border-none outline-none font-mono text-[11.5px] text-ink-textMuted text-right py-1.5 px-0.5 caret-ink-accent"
            />
          )}

          {/* Trạng thái: bản thảo (chì) ↔ đã đăng (mực) — ở màn rộng vẫn
              cùng dòng với tên bài như trước. */}
          {!isCompact && (
            <button
              onClick={() => updateLesson(chapter.id, lesson.id, { published: !lesson.published })}
              title={lesson.published ? 'Đã đăng — bấm để chuyển về bản thảo' : 'Bản thảo — bấm để hạ mực, đăng bài'}
              className={`vd-focusable shrink-0 flex items-center gap-[5px] bg-transparent border py-1.5 px-[9px] cursor-pointer text-[11.5px] font-medium ${lesson.published ? 'border-ink-accent text-ink-accent' : 'border-ink-pencil text-ink-textMuted'}`}
              style={{ borderRadius: R.sm }}
            >
              {lesson.published ? <Check size={12} /> : <Pencil size={12} />}
              {lesson.published ? 'Đã đăng' : 'Bản thảo'}
            </button>
          )}

          {!isCompact && (
            <div className="flex flex-col shrink-0">
              <button
                onClick={() => moveLesson(chapter.id, lesson.id, -1)}
                disabled={idx === 0}
                aria-label="Di chuyển lên"
                className={`vd-focusable bg-transparent border-none p-0 leading-none ${idx === 0 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => moveLesson(chapter.id, lesson.id, 1)}
                disabled={idx === total - 1}
                aria-label="Di chuyển xuống"
                className={`vd-focusable bg-transparent border-none p-0 leading-none ${idx === total - 1 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}

          {!isCompact && (
            <button
              onClick={() => removeLesson(chapter.id, lesson.id)}
              aria-label="Xóa bài học"
              className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim hover:text-ink-textMuted p-1"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {isCompact && (
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => updateLesson(chapter.id, lesson.id, { published: !lesson.published })}
              title={lesson.published ? 'Đã đăng — bấm để chuyển về bản thảo' : 'Bản thảo — bấm để hạ mực, đăng bài'}
              className={`vd-focusable mr-auto shrink-0 flex items-center gap-[5px] bg-transparent border py-1.5 px-[9px] cursor-pointer text-[11.5px] font-medium ${lesson.published ? 'border-ink-accent text-ink-accent' : 'border-ink-pencil text-ink-textMuted'}`}
              style={{ borderRadius: R.sm }}
            >
              {lesson.published ? <Check size={12} /> : <Pencil size={12} />}
              {lesson.published ? 'Đã đăng' : 'Bản thảo'}
            </button>

            <div className="flex flex-col shrink-0">
              <button
                onClick={() => moveLesson(chapter.id, lesson.id, -1)}
                disabled={idx === 0}
                aria-label="Di chuyển lên"
                className={`vd-focusable bg-transparent border-none p-0 leading-none ${idx === 0 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => moveLesson(chapter.id, lesson.id, 1)}
                disabled={idx === total - 1}
                aria-label="Di chuyển xuống"
                className={`vd-focusable bg-transparent border-none p-0 leading-none ${idx === total - 1 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronDown size={13} />
              </button>
            </div>

            <button
              onClick={() => removeLesson(chapter.id, lesson.id)}
              aria-label="Xóa bài học"
              className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim hover:text-ink-textMuted p-1"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Một chương: tiêu đề + danh sách bài + dòng "thêm bài" đứt nét ── */
  const renderChapter = (chapter: ChapterDraft, ci: number) => (
    <div
      key={chapter.id}
      className="bg-ink-panel border border-ink-border overflow-hidden mb-5"
      style={{ borderRadius: R.md, boxShadow: T_SHADOW_SM }}
    >
      {/* Mục 2 — bug thật do user test trên iPhone SE: 1 dòng dồn quá nhiều
          shrink-0 (icon kéo, "Chương 0X", input tên, "N bài", 3 nút hành
          động) — ở màn hẹp, input co về 0 vẫn không đủ, các nút cuối (xuống,
          xóa) bị đẩy ra ngoài viewport, MẤT HẲN không nút nào cứu (không
          scroll ngang, không dấu hiệu còn nội dung). GripVertical không có
          drag thật (chỉ decorative) — 2 nút lên/xuống là cách reorder DUY
          NHẤT, không được ẩn. Giải pháp: gãy thành 2 dòng ở màn hẹp — dòng 1
          chỉ tên chương, dòng 2 "N bài" + 3 nút hành động canh phải — thay
          vì nhồi 1 dòng rồi mất nút. */}
      <div className={`border-b border-ink-border py-3 px-4 ${isCompact ? 'flex flex-col gap-2' : 'flex items-center gap-2.5 py-3.5'}`}>
        <div className="flex items-center gap-2.5">
          <GripVertical size={14} className="text-ink-textDim shrink-0" />
          {!isCompact && (
            <span className="font-mono text-[11px] text-ink-textDim shrink-0">
              Chương {String(ci + 1).padStart(2, '0')}
            </span>
          )}
          <input
            value={chapter.title}
            onChange={e => updateChapter(chapter.id, { title: e.target.value })}
            placeholder="Tên chương…"
            className="vd-focusable flex-1 min-w-0 bg-transparent border-none outline-none text-base font-bold text-ink-text p-1 caret-ink-accent"
          />
          {/* shrink-0: tên chương dài (input flex-1 min-w-0 co lại trước) không
              được phép bóp các nút hành động này — cùng nguyên tắc đã áp dụng
              cho nhóm nút của dòng bài học bên dưới (renderLessonRow). Ở màn
              rộng, nhóm nút này vẫn nằm cùng dòng với tên chương. */}
          {!isCompact && (
            <>
              <span className="font-mono text-[11px] text-ink-textDim shrink-0">
                {chapter.lessons.length} bài
              </span>
              <button
                onClick={() => moveChapter(chapter.id, -1)}
                disabled={ci === 0}
                aria-label="Chương lên"
                className={`vd-focusable shrink-0 bg-transparent border-none p-0.5 leading-none ${ci === 0 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveChapter(chapter.id, 1)}
                disabled={ci === chapters.length - 1}
                aria-label="Chương xuống"
                className={`vd-focusable shrink-0 bg-transparent border-none p-0.5 leading-none ${ci === chapters.length - 1 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => removeChapter(chapter.id)}
                aria-label="Xóa chương"
                className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim p-1"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>

        {isCompact && (
          <div className="flex items-center gap-2.5 justify-end">
            <span className="font-mono text-[11px] text-ink-textDim shrink-0 mr-auto">
              {chapter.lessons.length} bài
            </span>
            <button
              onClick={() => moveChapter(chapter.id, -1)}
              disabled={ci === 0}
              aria-label="Chương lên"
              className={`vd-focusable shrink-0 bg-transparent border-none p-0.5 leading-none ${ci === 0 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => moveChapter(chapter.id, 1)}
              disabled={ci === chapters.length - 1}
              aria-label="Chương xuống"
              className={`vd-focusable shrink-0 bg-transparent border-none p-0.5 leading-none ${ci === chapters.length - 1 ? 'cursor-default text-ink-textDim' : 'cursor-pointer text-ink-textMuted'}`}
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={() => removeChapter(chapter.id)}
              aria-label="Xóa chương"
              className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="py-1">
        {chapter.lessons.map((l, li) => renderLessonRow(chapter, l, li, chapter.lessons.length))}

        {/* Dòng thêm bài — viền chì đứt nét, đúng ngôn ngữ "phác trước khi viết" */}
        <div className="flex items-stretch">
          <span style={{ width: MARGIN_W }} className="shrink-0" />
          <button
            onClick={() => addLesson(chapter.id)}
            className="vd-focusable flex-1 flex items-center gap-2 mt-1 mr-3 mb-2 ml-0 bg-transparent cursor-pointer pt-[9px] pr-3 pb-[9px] pl-3.5 text-[13.5px] font-medium text-ink-textMuted hover:text-ink-accent"
            style={{
              // Ghi đè ĐÚNG THỨ TỰ thuộc tính gốc: borderLeft (1.5px dashed
              // pencilLn) → border:'none' (reset toàn bộ 4 cạnh, width/color
              // về initial) → borderLeftStyle:'dashed' (chỉ đặt lại style).
              // Kết quả cascade THẬT là border-left: medium dashed currentColor
              // (không phải 1.5px pencilLn như tên biến gợi ý) — giữ nguyên
              // inline theo đúng thứ tự để không đổi hiệu ứng đang render.
              borderLeft: '1.5px dashed rgba(33,38,51,0.30)',
              border: 'none',
              borderLeftStyle: 'dashed',
              borderRadius: R.sm,
            }}
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
    <div
      className="flex flex-col gap-5 bg-ink-panel border border-ink-border p-5"
      style={{ borderRadius: R.md, boxShadow: T_SHADOW_SM }}
    >
      <div>
        <div className="text-[12.5px] font-semibold text-ink-textMuted mb-2">
          Ảnh bìa
        </div>
        <div
          className="w-full aspect-[16/9] bg-[linear-gradient(135deg,#2E4A9E_0%,#4A63B8_60%,#8FA6EE_100%)] border border-ink-border flex items-center justify-center text-[12.5px] font-medium text-[rgba(255,255,255,0.85)]"
          style={{ borderRadius: R.sm }}
        >
          Xem trước ảnh bìa
        </div>
      </div>

      <div>
        <div className="text-[12.5px] font-semibold text-ink-textMuted mb-2">
          Tên không gian
        </div>
        <input
          value={spaceTitle}
          onChange={e => setSpaceTitle(e.target.value)}
          className="vd-focusable w-full box-border bg-ink-page border border-ink-border py-2.5 px-3 text-[15px] font-semibold text-ink-text caret-ink-accent"
          style={{ borderRadius: R.sm }}
        />
      </div>

      <div>
        <div className="text-[12.5px] font-semibold text-ink-textMuted mb-2">
          Giới thiệu ngắn
        </div>
        <textarea
          value={spaceDesc}
          onChange={e => setSpaceDesc(e.target.value)}
          rows={3}
          className="vd-focusable w-full box-border resize-y bg-ink-page border border-ink-border py-2.5 px-3 text-[13.5px] text-ink-textMid leading-[1.6] caret-ink-accent"
          style={{ borderRadius: R.sm }}
        />
      </div>

      <div>
        <div className="text-[12.5px] font-semibold text-ink-textMuted mb-2">
          Hiển thị
        </div>
        <div className="flex gap-2">
          {([
            { key: 'private' as const, label: 'Riêng tư', icon: <EyeOff size={13} /> },
            { key: 'public'  as const, label: 'Công khai', icon: <Eye size={13} /> },
          ]).map(opt => {
            const isActive = visibility === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setVisibility(opt.key)}
                className={`vd-focusable flex-1 flex items-center justify-center gap-1.5 pt-[9px] pb-[9px] px-2.5 cursor-pointer border text-[13px] font-medium ${isActive ? 'bg-ink-accentA border-ink-accent text-ink-accent' : 'bg-transparent border-ink-border text-ink-textMuted'}`}
                style={{ borderRadius: R.sm }}
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-ink-border pt-4 flex flex-col gap-2">
        {/* w-5 trên số liệu bên dưới: đã kiểm tra với số 3 chữ số (khóa học
            50+ bài) — vì đây là flex item không có overflow:hidden, kích
            thước tối thiểu tự động của flexbox vẫn giãn theo nội dung
            (content-based min-width), nên số không bị cắt/clip, chỉ chiếm
            thêm vài px. Không phải trường hợp "genuinely rigid" nên giữ w-5
            nguyên vẹn thay vì đổi sang min-w. */}
        {[
          { n: String(chapters.length), label: 'chương' },
          { n: String(lessonCount),     label: 'bài học tổng' },
          { n: String(publishedCount),  label: 'đã đăng (mực)' },
          { n: String(draftCount),      label: 'còn ở bản thảo (chì)' },
        ].map((row, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="font-mono text-[13px] font-semibold text-ink-accent w-5">{row.n}</span>
            <span className="text-[13px] text-ink-textMuted">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className={beVietnam.className}>
      <style>{`
        ${VIBE_GLOBAL_CSS}
        .vd-row { transition: background 120ms; }
        .vd-row:hover { background: rgba(33,38,51,0.02); }
      `}</style>

      {/* ══ TOP BAR ══ */}
      <div
        style={{ height: TOP_BAR_H }}
        className="fixed top-0 left-0 right-0 z-50 bg-ink-panel border-b border-ink-border flex items-center px-7 gap-2 text-[12.5px] text-ink-textMuted"
      >
        <span className="shrink-0">Spaces</span>
        {/* Mục 2 — bug thật do user test trên iPhone SE: cả 2 crumb
            "Spaces"/"Soạn không gian học tập" đã `shrink-0` (đúng, không
            wrap chữ) nhưng CỘNG DỒN với nút "Lưu bản thảo" ở cuối thì tổng
            bề rộng không-co-được đã vượt quá 375px → phần thừa bị đẩy ra
            ngoài viewport bên phải, cắt mất nút lưu (không phải wrap như ở
            article/quiz, mà là tràn ngang vô hình). Ẩn crumb giữa ở màn hẹp
            + rút gọn label nút để tổng chiều rộng cố định luôn nhỏ hơn màn
            hẹp nhất còn hỗ trợ. */}
        {!isCompact && (
          <>
            <ChevronRight size={11} className="text-ink-textDim shrink-0" />
            <span className="shrink-0">Soạn không gian học tập</span>
          </>
        )}
        <ChevronRight size={11} className="text-ink-textDim shrink-0" />
        {/* spaceTitle hiển thị thật (không phải input) — tên dài phải co lại
            và cắt bớt, không được đẩy nút "Lưu bản thảo" ra ngoài thanh trên. */}
        <span
          className="min-w-0 flex-1 truncate text-ink-text font-medium"
          title={spaceTitle || 'Chưa đặt tên'}
        >
          {spaceTitle || 'Chưa đặt tên'}
        </span>

        <div className="ml-auto flex items-center gap-4 shrink-0">
          {savedTick && !isCompact && (
            <span key={savedTick} className="vd-ink-in font-mono text-[11.5px] text-ink-accent">
              đã lưu
            </span>
          )}
          <button
            onClick={save}
            className="vd-focusable flex items-center gap-[7px] py-[7px] px-4 bg-ink-accent text-ink-onAccent border-none cursor-pointer text-[13px] font-semibold"
            style={{ borderRadius: R.sm }}
          >
            {isCompact ? 'Lưu' : 'Lưu bản thảo'}
          </button>
        </div>
      </div>

      {/* ══ WORKSPACE ══ */}
      {/* Đã kiểm tra: đây là container cuộn TRANG (overflow-y-auto trên toàn
          bộ vùng dưới top bar), không phải wrapper cắt theo chiều cao cố
          định cho riêng danh sách chương/bài. Nhiều chương × nhiều bài chỉ
          làm nội dung dài hơn và cuộn bình thường — không bị clip — giống
          pattern ở các trang vibe-demo khác (home, spaces…). */}
      <div
        style={{ top: TOP_BAR_H }}
        className="fixed left-0 right-0 bottom-0 z-[1] flex justify-center bg-ink-page overflow-y-auto cs-scrollbar"
      >
        <div
          className="w-full max-w-[1240px] grid items-start"
          style={{
            padding: isCompact ? '20px 16px 48px' : '28px 32px 56px',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(0,1fr) 320px',
            gap: isCompact ? 20 : 32,
          }}
        >
          {/* ══ LEFT — bản thảo cấu trúc khóa học ══ */}
          <div>
            <h1 className="text-[clamp(19px,2.1vw,24px)] font-bold tracking-[-0.015em] text-ink-text m-0 mb-1">
              Cấu trúc bài học
            </h1>
            <p className="text-[13.5px] text-ink-textMuted m-0 mb-5 leading-[1.6]">
              Mục viền chì đứt nét là bản thảo — chỉ học viên xem trước mới thấy. Bấm{' '}
              <Pencil size={11} className="inline align-[-1px] text-ink-textMuted" /> để hạ mực và đăng bài.
            </p>

            {chapters.map((c, ci) => renderChapter(c, ci))}

            <button
              onClick={addChapter}
              className="vd-focusable w-full flex items-center justify-center gap-2 py-3.5 bg-transparent border-[1.5px] border-dashed border-ink-pencil cursor-pointer text-[14px] font-semibold text-ink-textMuted hover:text-ink-accent hover:border-ink-accent"
              style={{ borderRadius: R.md }}
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
    </div>
  );
}

// Chỉ dùng cho boxShadow — chưa có entry tương ứng trong tailwind.config.js
// nên giữ nguyên giá trị literal (khớp T.shadowSm cũ trong theme.ts) thay vì
// tự đặt thêm token mới.
const T_SHADOW_SM = '0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)';
