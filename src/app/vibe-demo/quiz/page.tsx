'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, XCircle, ChevronRight, ChevronLeft, X, Maximize2, Minimize2, ListVideo, RotateCcw, Play, Timer, WifiOff, History } from 'lucide-react';
import { beVietnam, T, R, TOP_BAR_H, MARGIN_W, useIsCompact, VIBE_GLOBAL_CSS } from '@/lib/vibe/theme';

/*
 * Chuyển sang Tailwind (namespace `ink-*`) theo đúng pattern đã thiết lập ở
 * about/page.tsx. Vẫn giữ style={{}} cho: (1) hằng số runtime dùng chung qua
 * theme.ts (MARGIN_W, TOP_BAR_H, R.sm/md/lg — không có class Tailwind cấu
 * hình sẵn); (2) giá trị PHỤ THUỘC STATE (timer, đáp án đã chọn, câu đang
 * xem, phase, focusMode...) — các nhánh màu/opacity/transform đổi theo state
 * này giữ nguyên dạng style={{}}; (3) T.shadowSm/T.shadowMd — chưa có entry
 * box-shadow trong tailwind.config.js. `beVietnam.className` áp 1 lần ở gốc
 * trang thay cho fontFamily lặp lại; T.mono (JetBrains Mono/Fira Code) → lớp
 * `font-mono` cho các phần tử đếm giờ/mono giữ được tính đọc.
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

// Vòng đời một bài kiểm tra:
//   intro  — tờ đề úp trên bàn: luật chơi + nút Bắt đầu
//   taking — phòng tắt đèn (focus mode BẮT BUỘC), đếm ngược, không xao nhãng;
//            chỉ chọn đáp án + di chuyển, KHÔNG chấm từng câu
//   result — nộp bài / hết giờ: đèn bật lại, điểm số + bản đồ đúng/sai
//   review — lật lại từng câu, thấy đáp án đúng (xanh lá) và lỗi sai (đỏ)
type Phase = 'intro' | 'taking' | 'result' | 'review';

function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Mục 4 — "trạng thái người dùng thật": làm bài quiz KHÔNG được coi là một
// hành động atomic — người học có thể mất mạng, đóng tab, hoặc bỏ ngang.
// Một bản ghi duy nhất trên localStorage đóng vai trò "tờ giấy nháp" chưa
// nộp: `submitted: false` = còn đang làm (autosave mỗi khi đổi câu/đáp án),
// `submitted: true` = đã nộp (giữ lại để có thể "xem kết quả lần trước" nếu
// quay lại màn intro mà không bấm "Làm lại"). Khoá theo lessonId vì mỗi bài
// học có thể có một quiz riêng.
interface SavedQuizState {
  picked: (number | null)[];
  secondsLeft: number;
  qIdx: number;
  submitted: boolean;
}
const savedQuizKey = (lessonId: string) => `vd-quiz-save-${lessonId}`;
function loadSavedQuiz(lessonId: string): SavedQuizState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(savedQuizKey(lessonId));
    return raw ? JSON.parse(raw) as SavedQuizState : null;
  } catch {
    return null; // JSON hỏng/bị chỉnh tay — coi như không có bản lưu, không throw.
  }
}
function saveQuiz(lessonId: string, state: SavedQuizState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(savedQuizKey(lessonId), JSON.stringify(state));
}
function clearSavedQuiz(lessonId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(savedQuizKey(lessonId));
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

  // Trạng thái "chưa nộp" hoặc "đã nộp trước đó" đọc từ localStorage — quyết
  // định màn intro hiện "Bắt đầu" đơn thuần hay mời tiếp tục/xem lại.
  const [savedAttempt, setSavedAttempt] = useState<SavedQuizState | null>(null);
  const [lastResult,   setLastResult]   = useState<SavedQuizState | null>(null);
  const [isOffline,    setIsOffline]    = useState(false);
// Mục 5 — a11y: câu thông báo đọc to bởi screen reader khi thời gian còn
// lại tới các mốc đáng chú ý. Không đọc mỗi giây (spam, không nghe kịp) —
// chỉ 30s/lần khi còn nhiều thời gian, rồi dày lên 10s/lần trong phút
// cuối, rồi từng giây trong 5 giây cuối.
const [timerAnnouncement, setTimerAnnouncement] = useState('');

  // Đọc bản lưu MỘT LẦN khi vào lại màn intro của đúng bài quiz đang active
  // (không đọc khi đang taking/result — tránh tự ý đè lên bài đang làm).
  useEffect(() => {
    if (phase !== 'intro') return;
    const saved = loadSavedQuiz(activeId);
    setSavedAttempt(saved && !saved.submitted ? saved : null);
    setLastResult(saved && saved.submitted ? saved : null);
  }, [phase, activeId]);

  // Mất mạng giữa lúc làm bài: dữ liệu vẫn nằm trên máy (autosave dưới đây),
  // chỉ cần báo cho người học biết KHÔNG mất gì, không cần chặn thao tác.
  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Autosave mỗi khi đổi câu/đáp án/giờ trong lúc đang thi — đây là câu trả
  // lời cho "mất mạng/đóng tab giữa lúc làm bài": không có gì để mất vì đề
  // luôn nằm trên máy, không phụ thuộc một lần submit ở cuối.
  useEffect(() => {
    if (phase !== 'taking') return;
    saveQuiz(activeId, { picked, secondsLeft, qIdx, submitted: false });
  }, [phase, activeId, picked, secondsLeft, qIdx]);

  // Đóng tab/refresh giữa lúc làm bài = "nộp bài trễ" nếu không có cảnh báo.
  // Autosave phía trên đã đảm bảo không mất dữ liệu, nhưng vẫn nhắc để người
  // học biết họ đang rời phòng thi (đề bài vẫn chờ ở lần quay lại sau).
  useEffect(() => {
    if (phase !== 'taking') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase]);

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

  // Mục 5 — a11y: cập nhật vùng aria-live theo mốc thời gian còn lại, cho
  // người dùng screen reader biết sắp hết giờ mà không cần nhìn màn hình.
  useEffect(() => {
    if (phase !== 'taking') return;
    const shouldAnnounce =
      secondsLeft === QUIZ_SECONDS ||
      (secondsLeft > 60 && secondsLeft % 30 === 0) ||
      (secondsLeft <= 60 && secondsLeft > 10 && secondsLeft % 10 === 0) ||
      secondsLeft <= 10;
    if (shouldAnnounce) setTimerAnnouncement(`Còn ${fmtTime(secondsLeft)}`);
  }, [phase, secondsLeft]);

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

  // Bắt đầu MỚI — dùng cho cả "Bắt đầu" lần đầu và "Bắt đầu lại từ đầu" khi
  // đã có bản lưu (dang làm hoặc đã nộp): luôn xoá bản lưu cũ trước, vì từ
  // thời điểm này bản lưu cũ không còn phản ánh đúng bài đang làm nữa.
  const startQuiz = () => {
    clearSavedQuiz(activeId);
    setSavedAttempt(null);
    setLastResult(null);
    setPicked(Array(QUIZ.length).fill(null));
    setSecondsLeft(QUIZ_SECONDS);
    setQIdx(0);
    setPhase('taking');
    setFocusMode(true);   // vào phòng thi = tắt đèn, không xao nhãng
    setOverlayOpen(false);
  };
  // Tiếp tục bài đang làm (mất mạng/đóng tab giữa lúc thi rồi quay lại).
  const resumeQuiz = () => {
    if (!savedAttempt) return;
    setPicked(savedAttempt.picked);
    setSecondsLeft(savedAttempt.secondsLeft);
    setQIdx(savedAttempt.qIdx);
    setSavedAttempt(null);
    setPhase('taking');
    setFocusMode(true);
    setOverlayOpen(false);
  };
  // Xem lại kết quả của lần nộp trước, không tính là một lượt làm mới.
  const viewLastResult = () => {
    if (!lastResult) return;
    setPicked(lastResult.picked);
    setSecondsLeft(lastResult.secondsLeft);
    setQIdx(0);
    setPhase('result');
  };
  const submitQuiz = () => {
    saveQuiz(activeId, { picked, secondsLeft, qIdx: 0, submitted: true });
    setPhase('result');
    setFocusMode(false);  // nộp bài = đèn bật lại
    setQIdx(0);
  };
  const backToIntro = () => {
    // "Làm lại" từ màn kết quả là ý định retake rõ ràng trong cùng phiên —
    // xoá bản lưu đã nộp để lần sau vào lại intro không mời "xem kết quả cũ"
    // của một bài mà người học đã chủ động chọn làm lại.
    clearSavedQuiz(activeId);
    setSavedAttempt(null);
    setLastResult(null);
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
    <div className="shrink-0 flex items-baseline gap-2 px-4 py-[13px] border-b border-ink-border">
      <span className="text-sm font-semibold text-ink-text">Bài học</span>
      <span className="font-mono text-[11px] text-ink-accent">{done}/{lessons.length}</span>
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
              className={`shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] ${isActive ? 'text-ink-accent font-semibold' : 'text-ink-textDim font-normal'}`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0 border-l border-ink-marginLn pt-[11px] pr-3 pb-[11px] pl-[14px] flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <div className={`text-sm leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap ${isActive ? 'text-ink-text font-semibold' : isDone ? 'text-ink-textMuted font-[450]' : 'text-ink-textMid font-[450]'}`}>
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
                className="vd-focusable bg-transparent border-none cursor-pointer p-0 pt-0.5 shrink-0"
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

  /* ── Lưới câu hỏi — dùng khi làm bài (đã trả lời?) và khi xem đáp án (đúng/sai) ── */
  // Đã xác minh cho bộ đề 50+ câu: `flex-wrap` tự xuống dòng thay vì tràn ngang
  // (không phải flex 1 dòng cố định), và mọi nơi gọi renderQuestionMap đều nằm
  // trong cột trái vốn đã overflow-y-auto (xem left column ở cuối file) — nên
  // container không cần thêm max-height/scroll riêng, chỉ cần cuộn tự nhiên
  // của trang. Kích thước nút 30×30 + padStart(2,'0') vẫn đủ chỗ cho 3 chữ số
  // (>99 câu) ở font-mono 11px. Giữ nguyên với bộ đề demo nhỏ hiện tại.
  const renderQuestionMap = (graded: boolean) => (
    <div className="flex flex-wrap gap-1.5">
      {QUIZ.map((q, i) => {
        const isCurrent = i === qIdx && (taking || reviewing);
        let border = 'rgba(33,38,51,0.10)', bg = 'transparent', color = 'rgba(33,38,51,0.28)';
        if (graded) {
          const ok = picked[i] === q.answer;
          border = ok ? '#217A4A' : '#A8362E';
          bg     = ok ? 'rgba(33,122,74,0.08)' : 'rgba(168,54,46,0.07)';
          color  = ok ? '#217A4A' : '#A8362E';
        } else if (picked[i] !== null) {
          border = '#2E4A9E'; bg = 'rgba(46,74,158,0.08)'; color = '#2E4A9E';
        }
        return (
          <button
            key={i}
            onClick={() => setQIdx(i)}
            aria-label={`Câu ${i + 1}${
              graded ? (picked[i] === q.answer ? ', đúng' : ', sai')
                : picked[i] !== null ? ', đã chọn' : ', chưa chọn'
            }`}
            aria-current={isCurrent ? 'true' : undefined}
            className="vd-focusable font-mono text-[11px] font-semibold cursor-pointer"
            style={{
              width: 30, height: 30, borderRadius: R.sm,
              border: `1px solid ${border}`,
              background: bg, color,
              boxShadow: isCurrent ? `0 0 0 2px rgba(33,38,51,0.20)` : 'none',
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
      <div className="flex items-stretch pt-[22px]">
        <span
          style={{ width: MARGIN_W }}
          className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] font-semibold text-ink-accent"
        >
          {String(qIdx + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 border-l border-ink-marginLn pt-0 pr-6 pb-[18px] pl-5 text-[17px] font-semibold text-ink-text leading-[1.45]">
          {question.q}
        </div>
      </div>

      {/* Mục 5 — a11y: role="radiogroup"/"radio" thay vì "button" đơn lẻ —
          đây là 4 lựa chọn LOẠI TRỪ NHAU của 1 câu hỏi, không phải 4 nút
          độc lập, nên screen reader cần biết đang chọn 1-trong-N. */}
      <div className="pb-2" role="radiogroup" aria-label={`Câu ${qIdx + 1}: ${question.q}`}>
        {question.choices.map((choice, ci) => {
          const isPicked  = picked[qIdx] === ci;
          const isCorrect = ci === question.answer;
          const showRight = graded && isCorrect;
          const showWrong = graded && isPicked && !isCorrect;

          return (
            <div
              key={ci}
              role="radio"
              aria-checked={isPicked}
              tabIndex={graded ? -1 : 0}
              aria-disabled={graded}
              onClick={() => pick(ci)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(ci); } }}
              className={`vd-focusable flex items-stretch transition-colors duration-[120ms] ${graded ? 'cursor-default' : 'cursor-pointer'}`}
              style={{
                background: showRight ? 'rgba(33,122,74,0.08)' : showWrong ? 'rgba(168,54,46,0.07)' : (!graded && isPicked) ? 'rgba(46,74,158,0.08)' : 'transparent',
              }}
              onMouseEnter={e => { if (!graded && !isPicked) (e.currentTarget as HTMLElement).style.background = 'rgba(33,38,51,0.03)'; }}
              onMouseLeave={e => { if (!graded && !isPicked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span
                style={{ width: MARGIN_W }}
                className={`shrink-0 flex items-start justify-center pt-3 font-mono text-[11px] ${(isPicked || showRight) ? 'font-semibold' : 'font-normal'} ${
                  showRight ? 'text-ink-correct' : showWrong ? 'text-ink-wrong' : isPicked ? 'text-ink-accent' : 'text-ink-textDim'
                }`}
              >
                {String.fromCharCode(65 + ci)}
              </span>
              <div className="flex-1 border-l border-ink-marginLn py-2.5 pr-6 pl-5 flex items-start gap-2.5">
                <span
                  className={`flex-1 text-[15px] leading-[1.5] ${(isPicked || showRight) ? 'font-[550]' : 'font-normal'} ${
                    showRight ? 'text-ink-correct' : showWrong ? 'text-ink-wrong' : graded ? 'text-ink-textMuted' : isPicked ? 'text-ink-text' : 'text-ink-textMid'
                  }`}
                >
                  {choice}
                </span>
                {showRight && <CheckCircle2 size={16} className="text-ink-correct shrink-0 mt-0.5" />}
                {showWrong && <XCircle      size={16} className="text-ink-wrong shrink-0 mt-0.5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Giải thích — chỉ trong review, như dòng mực chấm bài ghi thêm */}
      {graded && (
        <div className="vd-ink-in flex items-stretch pb-3.5">
          <span
            style={{ width: MARGIN_W }}
            className="shrink-0 flex items-start justify-center pt-[13px] font-mono text-[11px] text-ink-textMuted"
          >
            vì
          </span>
          <div className="flex-1 border-l border-ink-marginLn pt-2.5 pr-6 pb-0 pl-5 text-sm text-ink-textMid leading-[1.6]">
            {picked[qIdx] === null && (
              <span className="text-ink-wrong font-[550]">Chưa trả lời. </span>
            )}
            {question.explain}
          </div>
        </div>
      )}
    </>
  );

  /* ── Màn 1: tờ đề úp trên bàn — luật chơi + Bắt đầu ── */
  const renderIntro = () => (
    <div className="pt-[34px] pb-[30px]">
      <div className="flex items-stretch">
        <span style={{ width: MARGIN_W }} className="shrink-0" />
        <div className="flex-1 border-l border-ink-marginLn pt-0 pr-7 pb-0 pl-5">
          <div className="text-[13px] font-medium text-ink-textMuted mb-1.5">
            Bài kiểm tra
          </div>
          <div className="text-2xl font-bold tracking-[-0.015em] text-ink-text leading-[1.3]">
            {active.title}
          </div>
          <div className="text-[15px] text-ink-textMid mt-2.5 leading-[1.6]">
            Kiểm tra lại hai bài giảng đầu chương — Virtual DOM, JSX, re-render và App Router.
          </div>
        </div>
      </div>

      {/* Thông số bài thi — con số nằm trong lề, đúng ngữ pháp trang vở */}
      <div className="mt-6">
        {[
          { n: String(QUIZ.length),        label: 'câu hỏi trắc nghiệm, mỗi câu một đáp án đúng' },
          { n: fmtTime(QUIZ_SECONDS),      label: 'phút làm bài — hết giờ hệ thống tự nộp' },
          { n: `${PASS_COUNT}/${QUIZ.length}`, label: 'câu đúng để đạt bài này' },
        ].map((row, i) => (
          <div key={i} className="flex items-stretch">
            <span
              style={{ width: MARGIN_W }}
              className="shrink-0 flex items-start justify-center pt-[11px] font-mono text-xs font-semibold text-ink-accent"
            >
              {row.n}
            </span>
            <div className="flex-1 border-l border-ink-marginLn py-[9px] pr-7 pl-5 text-[14.5px] text-ink-textMid leading-[1.55]">
              {row.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-stretch mt-5">
        <span style={{ width: MARGIN_W }} className="shrink-0" />
        <div className="flex-1 border-l border-ink-marginLn pt-0 pr-7 pb-0 pl-5">
          <div className="text-[13.5px] text-ink-textMuted leading-[1.65]">
            Khi bắt đầu, phòng học sẽ tắt đèn — chỉ còn tờ bài và đồng hồ. Bạn di chuyển
            tự do giữa các câu, sửa đáp án bao nhiêu lần tùy ý; kết quả chỉ chấm khi nộp bài.
          </div>

          {/* Bỏ ngang giữa lúc làm bài (mất mạng/đóng tab) → mời tiếp tục
              đúng chỗ đã dừng, thay vì im lặng bắt đầu lại từ đầu. */}
          {savedAttempt && (
            <div
              className="mt-[18px] flex items-center gap-3 py-3 px-4"
              style={{ background: T.accentA, border: `1px solid ${T.accent}`, borderRadius: R.sm }}
            >
              <History size={16} className="text-ink-accent shrink-0" />
              <div className="flex-1 text-[13.5px] text-ink-text leading-[1.5]">
                Có một lượt làm bài chưa nộp — đang ở câu {savedAttempt.qIdx + 1}/{QUIZ.length},
                còn {fmtTime(savedAttempt.secondsLeft)}.
              </div>
            </div>
          )}

          {/* Đã nộp trước đó (và không đang có bài dở) → cho chọn xem lại
              kết quả cũ hay làm lại, không mặc định coi đây là lần đầu. */}
          {lastResult && !savedAttempt && (
            <div
              className="mt-[18px] flex items-center gap-3 py-3 px-4"
              style={{ background: 'rgba(33,38,51,0.03)', border: `1px solid ${T.border}`, borderRadius: R.sm }}
            >
              <History size={16} className="text-ink-textDim shrink-0" />
              <div className="flex-1 text-[13.5px] text-ink-textMid leading-[1.5]">
                Bạn đã nộp bài này —{' '}
                {lastResult.picked.reduce((s: number, v, i) => s + (v === QUIZ[i].answer ? 1 : 0), 0)}/{QUIZ.length} câu đúng.
              </div>
            </div>
          )}

          <div className="flex gap-2.5 mt-[22px]">
            <button
              onClick={savedAttempt ? resumeQuiz : startQuiz}
              className="vd-focusable inline-flex items-center gap-[9px] px-6 py-3 bg-ink-accent text-ink-onAccent border-none cursor-pointer text-[15px] font-semibold"
              style={{ borderRadius: R.sm }}
            >
              <Play size={15} />
              {savedAttempt ? 'Tiếp tục làm bài' : 'Bắt đầu'}
            </button>
            {lastResult && !savedAttempt && (
              <button
                onClick={viewLastResult}
                className="vd-focusable inline-flex items-center gap-2 px-5 py-3 bg-transparent text-ink-textMid border border-ink-borderHi cursor-pointer text-[14.5px] font-medium"
                style={{ borderRadius: R.sm }}
              >
                Xem kết quả lần trước
              </button>
            )}
            {(savedAttempt || lastResult) && (
              <button
                onClick={startQuiz}
                className="vd-focusable inline-flex items-center gap-2 px-5 py-3 bg-transparent text-ink-textMuted border-none cursor-pointer text-[13.5px] font-medium"
                style={{ borderRadius: R.sm }}
              >
                Bắt đầu lại từ đầu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Màn 2: đang làm bài — đồng hồ + câu hỏi + lưới điều hướng + nộp ── */
  const renderTaking = () => {
    const low = secondsLeft <= 60;
    return (
      <>
        <div className="flex items-center border-b border-ink-border">
          <span
            style={{ width: MARGIN_W, color: low ? '#A8362E' : 'rgba(33,38,51,0.50)' }}
            className="shrink-0 flex items-center justify-center"
          >
            <Timer size={14} />
          </span>
          <div className="flex-1 border-l border-ink-marginLn flex items-center gap-3 py-3 pr-6 pl-5">
            <span className="text-[13.5px] font-medium text-ink-textMuted">
              {active.title}
            </span>
            <span
              style={{ color: low ? '#A8362E' : '#212633' }}
              className="ml-auto font-mono text-base font-semibold [font-variant-numeric:tabular-nums]"
            >
              {fmtTime(secondsLeft)}
            </span>
            {/* Chỉ cho screen reader — đồng hồ hiện trên vẫn im lặng với
                aria (aria-hidden qua thuộc tính mono không đổi mỗi giây),
                vùng này mới là nơi đọc to theo mốc thời gian. */}
            <span role="status" aria-live="polite" className="sr-only">
              {timerAnnouncement}
            </span>
          </div>
        </div>

        {/* Mất mạng giữa lúc thi — dữ liệu vẫn an toàn (autosave localStorage
            phía trên), chỉ cần nói rõ để người học không hoảng khi thấy mất
            kết nối giữa phòng thi. */}
        {isOffline && (
          <div className="flex items-center gap-2.5 py-2 px-5" style={{ background: T.wrongA, color: T.wrong }}>
            <WifiOff size={13} className="shrink-0" />
            <span className="text-[12.5px] font-medium">
              Mất kết nối — câu trả lời vẫn được lưu tại máy, không mất dữ liệu.
            </span>
          </div>
        )}

        {renderQuestion(false)}

        <div className="border-t border-ink-border">
          <div className="flex items-stretch">
            <span
              style={{ width: MARGIN_W }}
              className="shrink-0 flex items-center justify-center font-mono text-[11px] text-ink-textMuted"
            >
              {answeredCount}/{QUIZ.length}
            </span>
            <div className="flex-1 border-l border-ink-marginLn pt-3.5 pr-6 pb-3 pl-5">
              {renderQuestionMap(false)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-0.5 pr-6 pb-3.5 pl-0">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <button
              onClick={() => setQIdx(i => Math.max(0, i - 1))}
              disabled={qIdx === 0}
              aria-label="Câu trước"
              className="vd-focusable inline-flex items-center gap-1.5 bg-transparent border border-ink-border px-3.5 py-2 text-[13.5px] font-medium"
              style={{ borderRadius: R.sm, cursor: qIdx === 0 ? 'default' : 'pointer', color: qIdx === 0 ? 'rgba(33,38,51,0.28)' : 'rgba(33,38,51,0.72)' }}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              onClick={() => setQIdx(i => Math.min(QUIZ.length - 1, i + 1))}
              disabled={qIdx === QUIZ.length - 1}
              aria-label="Câu sau"
              className="vd-focusable inline-flex items-center gap-1.5 bg-transparent border border-ink-border px-3.5 py-2 text-[13.5px] font-medium"
              style={{ borderRadius: R.sm, cursor: qIdx === QUIZ.length - 1 ? 'default' : 'pointer', color: qIdx === QUIZ.length - 1 ? 'rgba(33,38,51,0.28)' : 'rgba(33,38,51,0.72)' }}
            >
              Sau <ChevronRight size={14} />
            </button>

            <button
              onClick={submitQuiz}
              className="vd-focusable ml-auto py-[9px] px-5 bg-ink-accent text-ink-onAccent border-none cursor-pointer text-sm font-semibold"
              style={{ borderRadius: R.sm }}
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
      <div className="pt-[34px] pb-[30px]">
        <div className="flex items-stretch">
          <span style={{ width: MARGIN_W }} className="shrink-0" />
          <div className="flex-1 border-l border-ink-marginLn pt-0 pr-7 pb-0 pl-5">
            <div className="text-[13px] font-medium text-ink-textMuted mb-1.5">
              Kết quả · {secondsLeft === 0 ? 'hết giờ, hệ thống tự nộp' : `nộp sau ${fmtTime(timeUsed)}`}
            </div>
            <div className="flex items-baseline gap-3.5">
              <div className="text-[44px] font-bold tracking-[-0.02em] text-ink-text leading-none">
                {score}<span className="text-ink-textDim font-normal">/{QUIZ.length}</span>
              </div>
              <span
                className="text-[13px] font-semibold px-2.5 py-1"
                style={{
                  color: passed ? '#217A4A' : '#A8362E',
                  background: passed ? 'rgba(33,122,74,0.08)' : 'rgba(168,54,46,0.07)',
                  border: `1px solid ${passed ? '#217A4A' : '#A8362E'}`,
                  borderRadius: R.sm,
                }}
              >
                {passed ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>
            <div className="text-[15px] text-ink-textMid mt-3 leading-[1.6]">
              {score === QUIZ.length
                ? 'Trọn vẹn. Bài tiếp theo đã sẵn sàng.'
                : passed
                  ? 'Vững nền tảng. Lật lại các câu đỏ bên dưới trước khi đi tiếp.'
                  : 'Nên xem lại hai bài giảng rồi làm lại — các câu đỏ bên dưới là bản đồ ôn tập.'}
            </div>

            <div className="mt-[22px]">{renderQuestionMap(true)}</div>

            <div className="flex gap-2.5 mt-[26px]">
              <button
                onClick={() => { setQIdx(0); setPhase('review'); }}
                className="vd-focusable inline-flex items-center gap-2 py-2.5 px-[18px] bg-ink-accent text-ink-onAccent border-none cursor-pointer text-sm font-semibold"
                style={{ borderRadius: R.sm }}
              >
                Xem đáp án
              </button>
              <button
                onClick={backToIntro}
                className="vd-focusable inline-flex items-center gap-2 py-2.5 px-[18px] bg-transparent text-ink-textMid border border-ink-borderHi cursor-pointer text-sm font-medium"
                style={{ borderRadius: R.sm }}
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
      <div className="flex items-center border-b border-ink-border">
        <span
          style={{ width: MARGIN_W, color: score >= PASS_COUNT ? '#217A4A' : '#A8362E' }}
          className="shrink-0 flex items-center justify-center font-mono text-[11px] font-semibold"
        >
          {score}/{QUIZ.length}
        </span>
        <div className="flex-1 border-l border-ink-marginLn py-3 pr-6 pl-5 text-[13.5px] font-medium text-ink-textMuted">
          Đáp án & giải thích
        </div>
      </div>

      {renderQuestion(true)}

      <div className="border-t border-ink-border">
        <div className="flex items-stretch">
          <span
            style={{ width: MARGIN_W }}
            className="shrink-0 flex items-center justify-center font-mono text-[11px] text-ink-textMuted"
          >
            {String(qIdx + 1).padStart(2, '0')}/{QUIZ.length}
          </span>
          <div className="flex-1 border-l border-ink-marginLn pt-3.5 pr-6 pb-3 pl-5">
            {renderQuestionMap(true)}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-0.5 pr-6 pb-3.5 pl-0">
          <span style={{ width: MARGIN_W }} className="shrink-0" />
          <button
            onClick={() => setQIdx(i => Math.max(0, i - 1))}
            disabled={qIdx === 0}
            aria-label="Câu trước"
            className="vd-focusable inline-flex items-center gap-1.5 bg-transparent border border-ink-border px-3.5 py-2 text-[13.5px] font-medium"
            style={{ borderRadius: R.sm, cursor: qIdx === 0 ? 'default' : 'pointer', color: qIdx === 0 ? 'rgba(33,38,51,0.28)' : 'rgba(33,38,51,0.72)' }}
          >
            <ChevronLeft size={14} /> Trước
          </button>
          <button
            onClick={() => setQIdx(i => Math.min(QUIZ.length - 1, i + 1))}
            disabled={qIdx === QUIZ.length - 1}
            aria-label="Câu sau"
            className="vd-focusable inline-flex items-center gap-1.5 bg-transparent border border-ink-border px-3.5 py-2 text-[13.5px] font-medium"
            style={{ borderRadius: R.sm, cursor: qIdx === QUIZ.length - 1 ? 'default' : 'pointer', color: qIdx === QUIZ.length - 1 ? 'rgba(33,38,51,0.28)' : 'rgba(33,38,51,0.72)' }}
          >
            Sau <ChevronRight size={14} />
          </button>

          <button
            onClick={() => setPhase('result')}
            className="vd-focusable ml-auto py-[9px] px-[18px] bg-transparent text-ink-textMid border border-ink-borderHi cursor-pointer text-[13.5px] font-medium"
            style={{ borderRadius: R.sm }}
          >
            ← Kết quả
          </button>
        </div>
      </div>
    </>
  );

  /* ── Tờ giấy kiểm tra — stage của bản quiz ── */
  const renderSheet = () => (
    <div
      className="mx-auto bg-ink-panel border border-ink-border overflow-hidden flex flex-col"
      style={{ width: 'min(100%, 720px)', borderRadius: R.lg, boxShadow: T.shadowMd }}
    >
      {phase === 'intro'  && renderIntro()}
      {phase === 'taking' && renderTaking()}
      {phase === 'result' && renderResult()}
      {phase === 'review' && renderReview()}
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className={beVietnam.className}>
      <style>{VIBE_GLOBAL_CSS}</style>

      {/* ══ TITLE BAR — tắt đèn cùng căn phòng khi vào focus mode ══ */}
      <div
        style={{
          top: 0, height: TOP_BAR_H,
          background: focusMode ? '#1A1C22' : '#FFFFFF',
          borderBottom: `1px solid ${focusMode ? 'rgba(244,246,252,0.10)' : 'rgba(33,38,51,0.10)'}`,
          color: focusMode ? 'rgba(244,246,252,0.45)' : 'rgba(33,38,51,0.50)',
        }}
        className="fixed left-0 right-0 z-50 flex items-center px-7 gap-2 text-[12.5px] transition-[background,border-color,color] duration-[600ms] ease-in-out"
      >
        <span>Spaces</span>
        <ChevronRight size={11} style={{ color: focusMode ? 'rgba(244,246,252,0.25)' : 'rgba(33,38,51,0.28)' }} />
        <span>Lập trình web</span>
        <ChevronRight size={11} style={{ color: focusMode ? 'rgba(244,246,252,0.25)' : 'rgba(33,38,51,0.28)' }} />
        <span className="font-medium" style={{ color: focusMode ? 'rgba(244,246,252,0.85)' : '#212633' }}>{active.chapter}</span>

        <div className="ml-auto flex items-center gap-4">
          {taking ? (
            /* Đang thi: không có gì để bấm trên top bar — chỉ nhắc trạng thái */
            <span className="text-xs" style={{ color: 'rgba(244,246,252,0.45)' }}>
              Đang làm bài — nộp bài để rời phòng thi
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-20 h-0.5 overflow-hidden rounded-[1px]"
                  style={{ background: focusMode ? 'rgba(244,246,252,0.16)' : 'rgba(33,38,51,0.14)' }}
                >
                  <div
                    className="h-full transition-[width] duration-[400ms] ease-in-out"
                    style={{ width: `${pct}%`, background: focusMode ? '#8FA6EE' : '#2E4A9E' }}
                  />
                </div>
                <span className="font-mono text-[11px]" style={{ color: focusMode ? '#8FA6EE' : '#2E4A9E' }}>{pct}%</span>
              </div>

              <button
                onClick={() => { setFocusMode(v => !v); setOverlayOpen(false); }}
                aria-label={focusMode ? 'Thoát focus mode' : 'Vào focus mode'}
                title={focusMode ? 'Thoát focus mode' : 'Focus mode — tắt đèn phòng, chỉ còn bài làm'}
                className="vd-focusable w-[26px] h-[26px] flex items-center justify-center cursor-pointer shrink-0"
                style={{
                  background: focusMode ? 'rgba(143,166,238,0.14)' : 'none',
                  border: `1px solid ${focusMode ? '#8FA6EE' : 'rgba(33,38,51,0.10)'}`,
                  borderRadius: R.sm,
                  color: focusMode ? '#8FA6EE' : 'rgba(33,38,51,0.72)',
                }}
              >
                {focusMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══ WORKSPACE ══ */}
      <div
        style={{ top: TOP_BAR_H, background: focusMode ? '#1A1C22' : '#FAFAF7' }}
        className="fixed left-0 right-0 bottom-0 z-[1] flex justify-center transition-[background] duration-[600ms] ease-in-out"
      >
        <div
          style={{
            padding: isCompact ? '0 16px' : '0 32px',
            gridTemplateColumns: (focusMode || isCompact) ? '1fr' : '1fr 340px',
            gap: isCompact ? 16 : 36,
          }}
          className="w-full grid h-full"
        >

          {/* ══ LEFT COLUMN — tờ giấy kiểm tra. Cột LUÔN cuộn được vì chiều
              cao tờ giấy phụ thuộc nội dung câu hỏi, không khóa tỉ lệ như video. ══ */}
          <div className="relative flex flex-col h-full overflow-y-auto pb-10 justify-start cs-scrollbar">
            {!focusMode && (
              <div className="shrink-0 pt-[18px] pb-3.5">
                <h1 className="text-[clamp(19px,2.1vw,26px)] font-bold tracking-[-0.015em] leading-[1.25] m-0 text-ink-text">
                  {active.title}
                </h1>
              </div>
            )}

            <div style={{ paddingTop: focusMode ? 40 : 0 }} className="shrink-0 relative">
              {renderSheet()}

              {/* ── FOCUS MODE: overlay bài học. Khi ĐANG THI thì ẩn hẳn —
                  phòng thi không có gì để xao nhãng. ── */}
              {focusMode && !taking && (
                <>
                  <div
                    style={{
                      top: TOP_BAR_H,
                      borderRadius: R.lg,
                      boxShadow: T.shadowMd,
                      opacity: overlayOpen ? 1 : 0,
                      transform: overlayOpen ? 'translateX(0)' : 'translateX(12px)',
                      pointerEvents: overlayOpen ? 'auto' : 'none',
                    }}
                    className="fixed right-6 bottom-6 z-30 mt-6 w-[min(400px,86vw)] flex flex-col bg-ink-panel border border-ink-border overflow-hidden transition-[opacity,transform] duration-200 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="flex-1">{renderPanelHeader()}</div>
                      <button
                        onClick={() => setOverlayOpen(false)}
                        aria-label="Ẩn overlay"
                        className="vd-focusable shrink-0 bg-transparent border-none cursor-pointer text-ink-textDim px-3.5 flex items-center border-b border-ink-border h-full"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {renderPlaylist()}
                    </div>
                  </div>

                  <button
                    onClick={() => setOverlayOpen(v => !v)}
                    className="vd-focusable fixed right-6 bottom-6 z-20 flex items-center gap-2 py-[9px] px-4 bg-ink-panel border-none cursor-pointer text-[12.5px] font-medium text-ink-textMid transition-opacity duration-150 ease-in-out"
                    style={{
                      borderRadius: R.sm,
                      boxShadow: T.shadowMd,
                      opacity: overlayOpen ? 0 : 1,
                      pointerEvents: overlayOpen ? 'none' : 'auto',
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
              <div
                className="shrink-0 mt-4 min-h-[360px] flex flex-col bg-ink-panel border border-ink-border overflow-hidden"
                style={{ borderRadius: R.md, boxShadow: T.shadowSm }}
              >
                {renderPanelHeader()}
                <div className="flex flex-col min-h-[320px]">
                  {renderPlaylist()}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT — rail cố định ══ */}
          {!focusMode && !isCompact && (
            <div
              className="flex flex-col mt-[30px] overflow-hidden bg-ink-panel border border-ink-border"
              style={{ height: 'calc(100% - 30px)', borderRadius: R.md, boxShadow: T.shadowSm }}
            >
              {renderPanelHeader()}
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderPlaylist()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
