'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, XCircle, ChevronRight, ChevronLeft, X, Maximize2, Minimize2, ListVideo, RotateCcw, Play, Timer } from 'lucide-react';
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

// Bản quiz của vibe-demo: bài đang học là l03 (Quiz — Nền tảng React).
const LESSONS: Lesson[] = [
  { id: 'l01', title: 'Virtual DOM & Reconciliation',        chapter: 'Nền tảng React 18',    duration: '14:20',  status: 'completed'   },
  { id: 'l02', title: 'App Router, JSX & Component Model',  chapter: 'Nền tảng React 18',    duration: '22:15',  status: 'completed'   },
  { id: 'l03', title: 'Quiz — Nền tảng React',              chapter: 'Nền tảng React 18',    duration: '10 câu', status: 'in_progress' },
  { id: 'l04', title: 'useState & useEffect — Deep Dive',   chapter: 'Hooks & State',        duration: '28:40',  status: 'not_started' },
  { id: 'l05', title: 'useMemo, useCallback & Performance', chapter: 'Hooks & State',        duration: '35:10',  status: 'not_started' },
  { id: 'l06', title: 'Custom Hooks Pattern',               chapter: 'Hooks & State',        duration: '19:50',  status: 'not_started' },
  { id: 'l07', title: 'TanStack Query & REST API',          chapter: 'Async & Server Comp.', duration: '42:15',  status: 'not_started' },
  { id: 'l08', title: 'Server vs Client Components',        chapter: 'Async & Server Comp.', duration: '31:00',  status: 'not_started' },
];

interface Question { q: string; choices: string[]; answer: number; explain: string; }
const QUIZ: Question[] = [
  { q: 'Virtual DOM là gì?',
    choices: ['Bộ nhớ cache của trình duyệt', 'Bản sao nhẹ của DOM thật, nằm trong bộ nhớ', 'Một API chuẩn của trình duyệt', 'Cây HTML do server render sẵn'],
    answer: 1, explain: 'Virtual DOM là cây object JS mô tả UI — React thao tác trên nó trước, rồi mới đồng bộ tối thiểu xuống DOM thật.' },
  { q: 'Quá trình reconciliation làm nhiệm vụ gì?',
    choices: ['Xóa toàn bộ DOM rồi render lại', 'Đồng bộ state giữa các component', 'So sánh 2 cây Virtual DOM để tìm thay đổi tối thiểu', 'Nén bundle JS khi build'],
    answer: 2, explain: 'React diff cây mới với cây cũ và chỉ cập nhật đúng những node thực sự thay đổi.' },
  { q: 'JSX được biên dịch thành gì?',
    choices: ['Chuỗi HTML thuần', 'Lời gọi hàm tạo element (React.createElement / jsx runtime)', 'Template string của ES6', 'File .vue component'],
    answer: 1, explain: 'JSX chỉ là cú pháp — compiler chuyển nó thành lời gọi hàm trả về object element.' },
  { q: 'Component re-render khi nào?',
    choices: ['Khi state hoặc props của nó thay đổi', 'Chỉ khi gọi forceUpdate()', 'Mỗi 16ms một lần', 'Khi trình duyệt resize'],
    answer: 0, explain: 'Ngoài state/props của chính nó, component cũng re-render khi cha re-render hoặc context nó dùng đổi giá trị.' },
  { q: 'Thuộc tính `key` trong danh sách dùng để làm gì?',
    choices: ['Tăng tốc CSS selector', 'Sắp xếp phần tử theo thứ tự key', 'Mã hóa dữ liệu của item', 'Giúp React nhận diện từng phần tử qua các lần render'],
    answer: 3, explain: 'Key ổn định giúp reconciliation ghép đúng phần tử cũ–mới, tránh remount và mất state không đáng có.' },
  { q: 'useState trả về gì?',
    choices: ['Một object {value, set}', 'Cặp [giá trị hiện tại, hàm cập nhật]', 'Chỉ giá trị hiện tại', 'Một Promise chứa state'],
    answer: 1, explain: 'Destructuring mảng cho phép tự đặt tên: const [count, setCount] = useState(0).' },
  { q: 'Rules of Hooks yêu cầu điều gì?',
    choices: ['Hook phải đặt trong useEffect', 'Mỗi component chỉ được dùng 1 hook', 'Chỉ gọi hook ở top-level của component / custom hook', 'Hook phải khai báo trước JSX'],
    answer: 2, explain: 'Không gọi hook trong if / loop / nested function — React dựa vào THỨ TỰ gọi hook giữa các lần render.' },
  { q: 'Automatic batching trong React 18 nghĩa là gì?',
    choices: ['Gộp nhiều setState thành một lần re-render, kể cả trong async', 'Tự động lazy-load component', 'Gộp nhiều request API làm một', 'Chạy effect theo lô mỗi giây'],
    answer: 0, explain: 'Trước React 18, setState trong setTimeout/promise không được batch — React 18 batch ở mọi ngữ cảnh.' },
  { q: 'App Router (Next.js) xác định route dựa trên gì?',
    choices: ['File routes.config.js', 'Cấu trúc thư mục trong app/', 'Decorator trên component', 'Bảng route đăng ký lúc runtime'],
    answer: 1, explain: 'Mỗi thư mục là một segment; page.tsx là UI của route, layout.tsx bọc các segment con.' },
  { q: 'Server Component khác Client Component ở điểm nào?',
    choices: ['Chạy trên server, không gửi JS của nó xuống client', 'Chỉ render được HTML tĩnh', 'Không được import component khác', 'Bắt buộc phải async'],
    answer: 0, explain: 'Server Component render trên server và không tính vào bundle client — nhưng không dùng được state/effect.' },
];

const QUIZ_SECONDS = 600; // 10 câu × 60s
const PASS_COUNT   = 7;   // ngưỡng đạt: 7/10 câu đúng

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
// "Mực xanh trên giấy trắng" — cùng hệ token với /vibe-demo (bản video).
// Stage của bản quiz không phải MÀN HÌNH mà là TỜ GIẤY KIỂM TRA — sheet trắng
// dùng đúng motif lề vở: số câu và ký tự A/B/C/D nằm trong lề.
//
// Phân vai màu theo đúng nghi thức chấm bài:
//   - accent (mực xanh)  = nét bút của HỌC VIÊN — đáp án đang chọn khi làm bài.
//   - correct/wrong      = bút chấm của GIÁO VIÊN (xanh lá / đỏ) — CHỈ xuất
//     hiện sau khi nộp bài, không bao giờ dùng để trang trí.
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
  correct: '#217A4A',      // xanh lá bút chấm — đáp án đúng, sau khi nộp
  correctA:'rgba(33,122,74,0.08)',
  wrong:   '#A8362E',      // đỏ bút chấm — đáp án sai đã chọn, sau khi nộp
  wrongA:  'rgba(168,54,46,0.07)',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

const TOP_BAR_H = 52;
const R = { sm: 6, md: 12, lg: 16 };
const MARGIN_W = 56;

// Vòng đời một bài kiểm tra:
//   intro  — tờ đề úp trên bàn: luật chơi + nút Bắt đầu
//   taking — phòng tắt đèn (focus mode BẮT BUỘC), đếm ngược, không xao nhãng;
//            chỉ chọn đáp án + di chuyển, KHÔNG chấm từng câu
//   result — nộp bài / hết giờ: đèn bật lại, điểm số + bản đồ đúng/sai
//   review — lật lại từng câu, thấy đáp án đúng (xanh lá) và lỗi sai (đỏ)
type Phase = 'intro' | 'taking' | 'result' | 'review';

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

function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeQuizDemoPage() {
  const [lessons, setLessons]     = useState<Lesson[]>(LESSONS);
  const [activeId, setActiveId]   = useState('l03');
  const [focusMode, setFocusMode] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const isCompact = useIsCompact(900);

  const [phase, setPhase]   = useState<Phase>('intro');
  const [qIdx, setQIdx]     = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_SECONDS);

  useEffect(() => {
    const html = document.documentElement.style;
    const body = document.body.style;
    const prevHtml = html.overflow;
    const prevBody = body.overflow;
    html.overflow = 'hidden';
    body.overflow = 'hidden';
    return () => { html.overflow = prevHtml; body.overflow = prevBody; };
  }, []);

  // Đồng hồ đếm ngược — chỉ chạy khi đang làm bài.
  useEffect(() => {
    if (phase !== 'taking') return;
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Hết giờ → tự nộp bài.
  useEffect(() => {
    if (phase === 'taking' && secondsLeft === 0) {
      setPhase('result');
      setFocusMode(false);
      setOverlayOpen(false);
      setQIdx(0);
    }
  }, [phase, secondsLeft]);

  const active = lessons.find(l => l.id === activeId)!;
  const done   = lessons.filter(l => l.status === 'completed').length;
  const pct    = Math.round((done / lessons.length) * 100);

  const question      = QUIZ[qIdx];
  const answeredCount = picked.filter(v => v !== null).length;
  const score         = QUIZ.reduce((s, q, i) => s + (picked[i] === q.answer ? 1 : 0), 0);
  const timeUsed      = QUIZ_SECONDS - secondsLeft;
  const taking        = phase === 'taking';
  const reviewing     = phase === 'review';

  const startQuiz = () => {
    setPicked(Array(QUIZ.length).fill(null));
    setSecondsLeft(QUIZ_SECONDS);
    setQIdx(0);
    setPhase('taking');
    setFocusMode(true);   // vào phòng thi = tắt đèn, không xao nhãng
    setOverlayOpen(false);
  };
  const submitQuiz = () => {
    setPhase('result');
    setFocusMode(false);  // nộp bài = đèn bật lại
    setQIdx(0);
  };
  const backToIntro = () => {
    setPhase('intro');
    setFocusMode(false);
    setPicked(Array(QUIZ.length).fill(null));
    setSecondsLeft(QUIZ_SECONDS);
    setQIdx(0);
  };

  const pick = (choice: number) => {
    if (!taking) return;
    setPicked(p => p.map((v, i) => i === qIdx ? choice : v));
  };

  const markDone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLessons(prev => prev.map(l => l.id !== id ? l : {
      ...l, status: l.status === 'completed' ? 'not_started' : 'completed',
    }));
  };

  /* ── Rail: chỉ còn danh sách bài học (bản quiz không có tab ghi chú) ── */
  const renderPanelHeader = () => (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '13px 16px', borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink }}>Bài học</span>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent }}>{done}/{lessons.length}</span>
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

  /* ── Lưới câu hỏi — dùng khi làm bài (đã trả lời?) và khi xem đáp án (đúng/sai) ── */
  const renderQuestionMap = (graded: boolean) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {QUIZ.map((q, i) => {
        const isCurrent = i === qIdx && (taking || reviewing);
        let border: string = T.border, bg: string = 'transparent', color: string = T.inkDim;
        if (graded) {
          const ok = picked[i] === q.answer;
          border = ok ? T.correct : T.wrong;
          bg     = ok ? T.correctA : T.wrongA;
          color  = ok ? T.correct : T.wrong;
        } else if (picked[i] !== null) {
          border = T.accent; bg = T.accentA; color = T.accent;
        }
        return (
          <button
            key={i}
            onClick={() => setQIdx(i)}
            aria-label={`Câu ${i + 1}`}
            aria-current={isCurrent ? 'true' : undefined}
            className="vd-focusable"
            style={{
              width: 30, height: 30, borderRadius: R.sm,
              border: `1px solid ${border}`,
              background: bg, color,
              boxShadow: isCurrent ? `0 0 0 2px ${T.borderHi}` : 'none',
              fontFamily: T.mono, fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </button>
        );
      })}
    </div>
  );

  /* ── Một câu hỏi trên tờ giấy. graded=false: đang làm bài (mực xanh của
     học viên). graded=true: xem đáp án (bút chấm xanh lá/đỏ của giáo viên). ── */
  const renderQuestion = (graded: boolean) => (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', paddingTop: 22 }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 3,
          fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.accent,
        }}>
          {String(qIdx + 1).padStart(2, '0')}
        </span>
        <div style={{
          flex: 1, borderLeft: `1px solid ${T.marginLn}`,
          padding: '0 24px 18px 20px',
          fontFamily: T.sans, fontSize: 17, fontWeight: 600,
          color: T.ink, lineHeight: 1.45,
        }}>
          {question.q}
        </div>
      </div>

      <div style={{ paddingBottom: 8 }}>
        {question.choices.map((choice, ci) => {
          const isPicked  = picked[qIdx] === ci;
          const isCorrect = ci === question.answer;
          const showRight = graded && isCorrect;
          const showWrong = graded && isPicked && !isCorrect;

          return (
            <div
              key={ci}
              role="button"
              tabIndex={graded ? -1 : 0}
              aria-disabled={graded}
              onClick={() => pick(ci)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(ci); } }}
              className="vd-focusable"
              style={{
                display: 'flex', alignItems: 'stretch',
                cursor: graded ? 'default' : 'pointer',
                background: showRight ? T.correctA : showWrong ? T.wrongA : (!graded && isPicked) ? T.accentA : 'transparent',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { if (!graded && !isPicked) (e.currentTarget as HTMLElement).style.background = 'rgba(33,38,51,0.03)'; }}
              onMouseLeave={e => { if (!graded && !isPicked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{
                width: MARGIN_W, flexShrink: 0,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: 12,
                fontFamily: T.mono, fontSize: 11,
                fontWeight: (isPicked || showRight) ? 600 : 400,
                color: showRight ? T.correct : showWrong ? T.wrong : isPicked ? T.accent : T.inkDim,
              }}>
                {String.fromCharCode(65 + ci)}
              </span>
              <div style={{
                flex: 1, borderLeft: `1px solid ${T.marginLn}`,
                padding: '10px 24px 10px 20px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{
                  flex: 1,
                  fontFamily: T.sans, fontSize: 15, lineHeight: 1.5,
                  fontWeight: (isPicked || showRight) ? 550 : 400,
                  color: showRight ? T.correct : showWrong ? T.wrong : graded ? T.inkMuted : isPicked ? T.ink : T.inkMid,
                }}>
                  {choice}
                </span>
                {showRight && <CheckCircle2 size={16} style={{ color: T.correct, flexShrink: 0, marginTop: 2 }} />}
                {showWrong && <XCircle      size={16} style={{ color: T.wrong,   flexShrink: 0, marginTop: 2 }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Giải thích — chỉ trong review, như dòng mực chấm bài ghi thêm */}
      {graded && (
        <div className="vd-ink-in" style={{ display: 'flex', alignItems: 'stretch', paddingBottom: 14 }}>
          <span style={{
            width: MARGIN_W, flexShrink: 0,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 13,
            fontFamily: T.mono, fontSize: 11, color: T.inkMuted,
          }}>
            vì
          </span>
          <div style={{
            flex: 1, borderLeft: `1px solid ${T.marginLn}`,
            padding: '10px 24px 0 20px',
            fontFamily: T.sans, fontSize: 14, color: T.inkMid, lineHeight: 1.6,
          }}>
            {picked[qIdx] === null && (
              <span style={{ color: T.wrong, fontWeight: 550 }}>Chưa trả lời. </span>
            )}
            {question.explain}
          </div>
        </div>
      )}
    </>
  );

  /* ── Màn 1: tờ đề úp trên bàn — luật chơi + Bắt đầu ── */
  const renderIntro = () => (
    <div style={{ padding: '34px 0 30px' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <span style={{ width: MARGIN_W, flexShrink: 0 }} />
        <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 28px 0 20px' }}>
          <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.inkMuted, marginBottom: 6 }}>
            Bài kiểm tra
          </div>
          <div style={{
            fontFamily: T.sans, fontSize: 24, fontWeight: 700,
            letterSpacing: '-0.015em', color: T.ink, lineHeight: 1.3,
          }}>
            {active.title}
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 15, color: T.inkMid, marginTop: 10, lineHeight: 1.6 }}>
            Kiểm tra lại hai bài giảng đầu chương — Virtual DOM, JSX, re-render và App Router.
          </div>
        </div>
      </div>

      {/* Thông số bài thi — con số nằm trong lề, đúng ngữ pháp trang vở */}
      <div style={{ marginTop: 24 }}>
        {[
          { n: String(QUIZ.length),        label: 'câu hỏi trắc nghiệm, mỗi câu một đáp án đúng' },
          { n: fmtTime(QUIZ_SECONDS),      label: 'phút làm bài — hết giờ hệ thống tự nộp' },
          { n: `${PASS_COUNT}/${QUIZ.length}`, label: 'câu đúng để đạt bài này' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{
              width: MARGIN_W, flexShrink: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 11,
              fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.accent,
            }}>
              {row.n}
            </span>
            <div style={{
              flex: 1, borderLeft: `1px solid ${T.marginLn}`,
              padding: '9px 28px 9px 20px',
              fontFamily: T.sans, fontSize: 14.5, color: T.inkMid, lineHeight: 1.55,
            }}>
              {row.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 20 }}>
        <span style={{ width: MARGIN_W, flexShrink: 0 }} />
        <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 28px 0 20px' }}>
          <div style={{ fontFamily: T.sans, fontSize: 13.5, color: T.inkMuted, lineHeight: 1.65 }}>
            Khi bắt đầu, phòng học sẽ tắt đèn — chỉ còn tờ bài và đồng hồ. Bạn di chuyển
            tự do giữa các câu, sửa đáp án bao nhiêu lần tùy ý; kết quả chỉ chấm khi nộp bài.
          </div>
          <button
            onClick={startQuiz}
            className="vd-focusable"
            style={{
              marginTop: 22,
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '12px 24px',
              background: T.accent, color: T.onAccent,
              border: 'none', borderRadius: R.sm, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 15, fontWeight: 600,
            }}
          >
            <Play size={15} />
            Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Màn 2: đang làm bài — đồng hồ + câu hỏi + lưới điều hướng + nộp ── */
  const renderTaking = () => {
    const low = secondsLeft <= 60;
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{
            width: MARGIN_W, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: low ? T.wrong : T.inkMuted,
          }}>
            <Timer size={14} />
          </span>
          <div style={{
            flex: 1, borderLeft: `1px solid ${T.marginLn}`,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 24px 12px 20px',
          }}>
            <span style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, color: T.inkMuted }}>
              {active.title}
            </span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: T.mono, fontSize: 16, fontWeight: 600,
              color: low ? T.wrong : T.ink,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtTime(secondsLeft)}
            </span>
          </div>
        </div>

        {renderQuestion(false)}

        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{
              width: MARGIN_W, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.mono, fontSize: 11, color: T.inkMuted,
            }}>
              {answeredCount}/{QUIZ.length}
            </span>
            <div style={{
              flex: 1, borderLeft: `1px solid ${T.marginLn}`,
              padding: '14px 24px 12px 20px',
            }}>
              {renderQuestionMap(false)}
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '2px 24px 14px 0',
          }}>
            <span style={{ width: MARGIN_W, flexShrink: 0 }} />
            <button
              onClick={() => setQIdx(i => Math.max(0, i - 1))}
              disabled={qIdx === 0}
              aria-label="Câu trước"
              className="vd-focusable"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: `1px solid ${T.border}`, borderRadius: R.sm,
                padding: '8px 14px', cursor: qIdx === 0 ? 'default' : 'pointer',
                fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
                color: qIdx === 0 ? T.inkDim : T.inkMid,
              }}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              onClick={() => setQIdx(i => Math.min(QUIZ.length - 1, i + 1))}
              disabled={qIdx === QUIZ.length - 1}
              aria-label="Câu sau"
              className="vd-focusable"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: `1px solid ${T.border}`, borderRadius: R.sm,
                padding: '8px 14px', cursor: qIdx === QUIZ.length - 1 ? 'default' : 'pointer',
                fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
                color: qIdx === QUIZ.length - 1 ? T.inkDim : T.inkMid,
              }}
            >
              Sau <ChevronRight size={14} />
            </button>

            <button
              onClick={submitQuiz}
              className="vd-focusable"
              style={{
                marginLeft: 'auto',
                padding: '9px 20px',
                background: T.accent, color: T.onAccent,
                border: 'none', borderRadius: R.sm, cursor: 'pointer',
                fontFamily: T.sans, fontSize: 14, fontWeight: 600,
              }}
            >
              Nộp bài
            </button>
          </div>
        </div>
      </>
    );
  };

  /* ── Màn 3: kết quả — điểm, thời gian, bản đồ đúng/sai ── */
  const renderResult = () => {
    const passed = score >= PASS_COUNT;
    return (
      <div style={{ padding: '34px 0 30px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <span style={{ width: MARGIN_W, flexShrink: 0 }} />
          <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 28px 0 20px' }}>
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.inkMuted, marginBottom: 6 }}>
              Kết quả · {secondsLeft === 0 ? 'hết giờ, hệ thống tự nộp' : `nộp sau ${fmtTime(timeUsed)}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ fontFamily: T.sans, fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em', color: T.ink, lineHeight: 1 }}>
                {score}<span style={{ color: T.inkDim, fontWeight: 400 }}>/{QUIZ.length}</span>
              </div>
              <span style={{
                fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                color: passed ? T.correct : T.wrong,
                background: passed ? T.correctA : T.wrongA,
                border: `1px solid ${passed ? T.correct : T.wrong}`,
                borderRadius: R.sm, padding: '4px 10px',
              }}>
                {passed ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 15, color: T.inkMid, marginTop: 12, lineHeight: 1.6 }}>
              {score === QUIZ.length
                ? 'Trọn vẹn. Bài tiếp theo đã sẵn sàng.'
                : passed
                  ? 'Vững nền tảng. Lật lại các câu đỏ bên dưới trước khi đi tiếp.'
                  : 'Nên xem lại hai bài giảng rồi làm lại — các câu đỏ bên dưới là bản đồ ôn tập.'}
            </div>

            <div style={{ marginTop: 22 }}>{renderQuestionMap(true)}</div>

            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <button
                onClick={() => { setQIdx(0); setPhase('review'); }}
                className="vd-focusable"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px',
                  background: T.accent, color: T.onAccent,
                  border: 'none', borderRadius: R.sm, cursor: 'pointer',
                  fontFamily: T.sans, fontSize: 14, fontWeight: 600,
                }}
              >
                Xem đáp án
              </button>
              <button
                onClick={backToIntro}
                className="vd-focusable"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px',
                  background: 'none', color: T.inkMid,
                  border: `1px solid ${T.borderHi}`, borderRadius: R.sm, cursor: 'pointer',
                  fontFamily: T.sans, fontSize: 14, fontWeight: 500,
                }}
              >
                <RotateCcw size={14} />
                Làm lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── Màn 4: xem đáp án — lật lại từng câu với bút chấm xanh lá / đỏ ── */
  const renderReview = () => (
    <>
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.mono, fontSize: 11, fontWeight: 600,
          color: score >= PASS_COUNT ? T.correct : T.wrong,
        }}>
          {score}/{QUIZ.length}
        </span>
        <div style={{
          flex: 1, borderLeft: `1px solid ${T.marginLn}`,
          padding: '12px 24px 12px 20px',
          fontFamily: T.sans, fontSize: 13.5, fontWeight: 500, color: T.inkMuted,
        }}>
          Đáp án & giải thích
        </div>
      </div>

      {renderQuestion(true)}

      <div style={{ borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <span style={{
            width: MARGIN_W, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.mono, fontSize: 11, color: T.inkMuted,
          }}>
            {String(qIdx + 1).padStart(2, '0')}/{QUIZ.length}
          </span>
          <div style={{
            flex: 1, borderLeft: `1px solid ${T.marginLn}`,
            padding: '14px 24px 12px 20px',
          }}>
            {renderQuestionMap(true)}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '2px 24px 14px 0',
        }}>
          <span style={{ width: MARGIN_W, flexShrink: 0 }} />
          <button
            onClick={() => setQIdx(i => Math.max(0, i - 1))}
            disabled={qIdx === 0}
            aria-label="Câu trước"
            className="vd-focusable"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: `1px solid ${T.border}`, borderRadius: R.sm,
              padding: '8px 14px', cursor: qIdx === 0 ? 'default' : 'pointer',
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
              color: qIdx === 0 ? T.inkDim : T.inkMid,
            }}
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <button
            onClick={() => setQIdx(i => Math.min(QUIZ.length - 1, i + 1))}
            disabled={qIdx === QUIZ.length - 1}
            aria-label="Câu sau"
            className="vd-focusable"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: `1px solid ${T.border}`, borderRadius: R.sm,
              padding: '8px 14px', cursor: qIdx === QUIZ.length - 1 ? 'default' : 'pointer',
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
              color: qIdx === QUIZ.length - 1 ? T.inkDim : T.inkMid,
            }}
          >
            Sau <ChevronRight size={14} />
          </button>

          <button
            onClick={() => setPhase('result')}
            className="vd-focusable"
            style={{
              marginLeft: 'auto',
              padding: '9px 18px',
              background: 'none', color: T.inkMid,
              border: `1px solid ${T.borderHi}`, borderRadius: R.sm, cursor: 'pointer',
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 500,
            }}
          >
            ← Kết quả
          </button>
        </div>
      </div>
    </>
  );

  /* ── Tờ giấy kiểm tra — stage của bản quiz ── */
  const renderSheet = () => (
    <div style={{
      width: 'min(100%, 720px)',
      margin: '0 auto',
      background: T.panel,
      border: `1px solid ${T.border}`,
      borderRadius: R.lg,
      boxShadow: T.shadowMd,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {phase === 'intro'  && renderIntro()}
      {phase === 'taking' && renderTaking()}
      {phase === 'result' && renderResult()}
      {phase === 'review' && renderReview()}
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
          {taking ? (
            /* Đang thi: không có gì để bấm trên top bar — chỉ nhắc trạng thái */
            <span style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(244,246,252,0.45)' }}>
              Đang làm bài — nộp bài để rời phòng thi
            </span>
          ) : (
            <>
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
                onClick={() => { setFocusMode(v => !v); setOverlayOpen(false); }}
                aria-label={focusMode ? 'Thoát focus mode' : 'Vào focus mode'}
                title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn bài làm'}
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
            </>
          )}
        </div>
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

          {/* ══ LEFT COLUMN — tờ giấy kiểm tra. Cột LUÔN cuộn được vì chiều
              cao tờ giấy phụ thuộc nội dung câu hỏi, không khóa tỉ lệ như video. ══ */}
          <div
            style={{
              position: 'relative', display: 'flex', flexDirection: 'column',
              height: '100%',
              overflowY: 'auto',
              paddingBottom: 40,
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
              {renderSheet()}

              {/* ── FOCUS MODE: overlay bài học. Khi ĐANG THI thì ẩn hẳn —
                  phòng thi không có gì để xao nhãng. ── */}
              {focusMode && !taking && (
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
                      <div style={{ flex: 1 }}>{renderPanelHeader()}</div>
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
                      {renderPlaylist()}
                    </div>
                  </div>

                  <button
                    onClick={() => setOverlayOpen(v => !v)}
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
                    <span>{done}/{lessons.length} bài học</span>
                  </button>
                </>
              )}
            </div>

            {/* Compact & không focus: danh sách bài học xếp dưới tờ giấy */}
            {isCompact && !focusMode && (
              <div style={{
                flexShrink: 0, marginTop: 16, minHeight: 360,
                display: 'flex', flexDirection: 'column',
                background: T.panel, border: `1px solid ${T.border}`,
                borderRadius: R.md, overflow: 'hidden',
                boxShadow: T.shadowSm,
              }}>
                {renderPanelHeader()}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
                  {renderPlaylist()}
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
              {renderPanelHeader()}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {renderPlaylist()}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
