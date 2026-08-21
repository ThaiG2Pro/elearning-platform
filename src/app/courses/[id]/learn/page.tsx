'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import YoutubePlayer, { VideoPlayerHandle } from '@/components/YoutubePlayer';
import VimeoPlayer from '@/components/VimeoPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { getLessons, getLessonProgress, updateLessonProgress, flushLessonProgress, startQuiz, submitQuiz, addLessonNote, getLessonNotes, deleteLessonNote } from '@/lib/course';
import { Lesson, LessonProgress, QuizSession, QuizResult, LessonNote } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// Porting logic từ vibe-demo/quiz (savedQuizKey/loadSavedQuiz/...): bản nháp
// cục bộ cho lượt làm bài ĐANG DIỄN RA, để mất mạng/đóng tab/reload giữa lúc
// làm bài không xoá sạch đáp án đã chọn. Khác vibe-demo (session giả lập
// hoàn toàn ở client): ở đây phiên làm bài thật sống ở server
// (QuizService.startQuiz), và server đã tự tái dùng attempt còn sống (chưa
// nộp, chưa hết 10 phút) — nên bản nháp chỉ cần khớp đúng `sessionId` server
// trả về là an toàn để khôi phục đáp án + câu đang xem, không cần tự quản lý
// đồng hồ đếm ngược ở đây như vibe-demo (đồng hồ vẫn tính từ `expiresAt`).
interface QuizDraft {
    sessionId: string;
    answers: Record<string, string>;
    qIdx: number;
}
const quizDraftKey = (lessonId: string) => `learn-quiz-draft-${lessonId}`;
function loadQuizDraft(lessonId: string): QuizDraft | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(quizDraftKey(lessonId));
        return raw ? JSON.parse(raw) as QuizDraft : null;
    } catch {
        return null; // bản lưu hỏng/bị chỉnh tay — coi như không có, không throw.
    }
}
function saveQuizDraft(lessonId: string, draft: QuizDraft) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(quizDraftKey(lessonId), JSON.stringify(draft));
    } catch {
        // localStorage đầy/bị chặn (private mode) — bản nháp là tiện ích
        // tăng cường, không phải nguồn dữ liệu chính (server vẫn giữ session).
    }
}
function clearQuizDraft(lessonId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(quizDraftKey(lessonId));
}

export default function LearningPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;

    // Main states
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
    const [appState, setAppState] = useState<'loading' | 'idle' | 'quiz_ready' | 'quiz_doing' | 'quiz_result' | 'quiz_review' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // Quiz states
    const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    // Guards against a fast double-click on "Nộp bài" firing two concurrent
    // submitQuiz requests, and against the auto-submit-on-timeout timer
    // firing on top of a manual submit already in flight.
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
    // Porting logic từ vibe-demo/quiz: hiện MỘT câu tại một thời điểm (khi
    // làm bài lẫn khi xem lại đáp án) thay vì đổ hết câu hỏi ra một danh
    // sách cuộn dài — kèm lưới điều hướng câu hỏi (question map).
    const [quizQIdx, setQuizQIdx] = useState(0);
    // vibe-demo: mất mạng giữa lúc làm bài không mất dữ liệu (autosave cục bộ
    // dưới đây) — chỉ cần báo cho học viên biết, không cần chặn thao tác.
    const [isOffline, setIsOffline] = useState(false);
    // vibe-demo (mục a11y): câu thông báo đọc to bởi screen reader theo mốc
    // thời gian còn lại — không đọc mỗi giây (spam), thưa dần khi còn nhiều
    // thời gian, dày lên trong phút cuối.
    const [timerAnnouncement, setTimerAnnouncement] = useState('');

    // UI states — WP1.5.4: a lesson can have many notes now, not one blob.
    const [notes, setNotes] = useState<LessonNote[]>([]);
    const [noteDraft, setNoteDraft] = useState('');
    const [pinToTimestamp, setPinToTimestamp] = useState(true);
    const [isSavingNote, setIsSavingNote] = useState(false);
    // WP1.5.12 — progress-save failures used to be swallowed entirely
    // (console.error only); this surfaces a small non-blocking banner so the
    // learner knows their last watch position may not have been saved.
    const [progressSyncError, setProgressSyncError] = useState(false);
    // WP1.10.4 — dismissible cue shown once a lesson is marked complete,
    // suggesting the owner add a quiz/tóm tắt for it (separate from the
    // always-visible sidebar card below, which doesn't need a trigger).
    const [showQuizCue, setShowQuizCue] = useState(false);
    // WP1.2 — focus mode: hides the site header + lesson sidebar so the
    // learner sees only the video/quiz, no nav/recommendation distractions.
    const [focusMode, setFocusMode] = useState(false);

    // YouTube states
    const [videoDuration, setVideoDuration] = useState<number>(0);
    // WP1.5.14 — the "Tiến độ: mm:ss / mm:ss" readout used to read straight off
    // `lessonProgress.currentPosition`, which for YouTube/Vimeo only gets set
    // once (on lesson load) — the throttled ≥5s-delta sync path never wrote it
    // back, so the number froze at whatever it was when the page loaded even
    // though the video kept playing. This is purely a local/client-side
    // display value updated on every player tick, decoupled from the (still
    // throttled) DB-persistence path — no need for it to round-trip the
    // server just to redraw a label.
    const [livePosition, setLivePosition] = useState<number>(0);

    // Progress tracking refs (lesson-bound)
    const lastSentTimeRef = useRef<number>(0);
    const quizTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Video refs
    const videoRef = useRef<HTMLVideoElement>(null);
    // WP1.5.3/1.5.4: imperative handle to whichever adapter is mounted
    // (YouTube or Vimeo) — used for "add note at current time" and for
    // clicking a note to seek the player back to its timestamp.
    const playerHandleRef = useRef<VideoPlayerHandle>(null);

    // Helper function to extract YouTube video ID
    const getYouTubeVideoId = (url: string): string | null => {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    // Helper function to check if URL is YouTube
    const isYouTubeUrl = (url: string): boolean => {
        return url.includes('youtube.com') || url.includes('youtu.be');
    };

    // WP1.5.3: Vimeo had a thumbnail but no playback adapter — URLs fell
    // through to the plain <video> tag and silently failed to play.
    const isVimeoUrl = (url: string): boolean => url.includes('vimeo.com');

    const getVimeoVideoId = (url: string): string | null => {
        const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
        return match ? match[1] : null;
    };

    // Memoize videoId so it doesn't change reference unless the lesson changes
    const youtubeVideoId = useMemo(() => {
        return currentLesson?.videoUrl && isYouTubeUrl(currentLesson.videoUrl)
            ? getYouTubeVideoId(currentLesson.videoUrl)
            : null;
    }, [currentLesson?.videoUrl]);

    const vimeoVideoId = useMemo(() => {
        return currentLesson?.videoUrl && isVimeoUrl(currentLesson.videoUrl)
            ? getVimeoVideoId(currentLesson.videoUrl)
            : null;
    }, [currentLesson?.videoUrl]);

    // WP1.5.12 — marks a lesson complete in the sidebar/header-bar `lessons`
    // list the moment the backend confirms it, instead of only after a full
    // page reload (that list was fetched once in loadCourseData and never
    // patched again).
    const markLessonCompleted = useCallback((lessonId: string) => {
        setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, isCompleted: true } : l));
        // WP1.10.4 — cue theo thời điểm: lesson vừa hoàn thành → gợi ý tạo
        // quiz/tóm tắt, không phụ thuộc việc bấm đúng lúc tạo course.
        setShowQuizCue(true);
    }, []);

    // Memoize callbacks to prevent remounting
    const handleProgressUpdate = useCallback(async (currentTime: number) => {
        const roundedTime = Math.floor(currentTime);
        // Local display only — every tick, no throttle, no network round-trip.
        setLivePosition(roundedTime);

        if (Math.abs(roundedTime - lastSentTimeRef.current) >= 5) {
            if (!currentLesson) return;

            const previousSentTime = lastSentTimeRef.current;
            // CẬP NHẬT NGAY LẬP TỨC TRƯỚC KHI GỌI API
            // Việc này ngăn các nhịp setInterval sau gửi trùng dữ liệu
            lastSentTimeRef.current = roundedTime;
            try {
                const progress = await updateLessonProgress(currentLesson.id, roundedTime, videoDuration);
                setProgressSyncError(false);
                if (progress?.isCompleted) markLessonCompleted(currentLesson.id);
            } catch (err) {
                console.error('BE Sync Error:', err);
                // WP1.5.12: previously this failure was fully silent and
                // lastSentTimeRef stayed advanced, so the next 5s tick would
                // just skip re-sending this window — that position was lost
                // for good. Roll back so the next tick retries, and surface
                // the failure instead of hiding it.
                lastSentTimeRef.current = previousSentTime;
                setProgressSyncError(true);
            }
        }
    }, [currentLesson, videoDuration, markLessonCompleted]);

    // WP1.5.13 — this fires from the players' `beforeunload` handler, i.e.
    // the tab is closing right now. A normal awaited axios call can be
    // silently aborted mid-flight by the browser before it reaches the
    // network, and there's no UI left afterwards to show a sync-error banner
    // anyway — so this is fire-and-forget via flushLessonProgress
    // (fetch+keepalive), not the regular updateLessonProgress path.
    const handleFlushUpdate = useCallback((time: number) => {
        if (!currentLesson) return;
        flushLessonProgress(currentLesson.id, Math.floor(time), videoDuration);
    }, [currentLesson, videoDuration]);

    const handleDurationUpdate = useCallback((duration: number) => {
        setVideoDuration(duration);
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
            router.push('/');
        } catch (error: any) {
            setUser(null);
            router.push('/');
        }
    };

    const handleJoin = () => {
        const currentUrl = window.location.pathname;
        router.push(`/join?continueUrl=${encodeURIComponent(currentUrl)}`);
    };

    const loadUser = useCallback(() => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    }, []);

    const loadLessonData = useCallback(async (lessonId: string, lessonType: string) => {
        // console.log('loadLessonData called with:', { lessonId, lessonType });
        try {
            const [progress, lessonNotes] = await Promise.all([
                getLessonProgress(lessonId),
                getLessonNotes(lessonId)
            ]);

            // console.log('Progress and notes loaded:', { progress, lessonNotes });
            setLessonProgress(progress);
            // Seed the live display with the saved resume position — it's
            // then driven purely by player ticks until the lesson changes.
            setLivePosition(progress?.currentPosition || 0);
            setNotes(lessonNotes);
            setNoteDraft('');

            // Always set appState based on lesson type
            if (lessonType.toLowerCase() === 'video') {
                // console.log('Setting appState to idle for video');
                setAppState('idle');
            } else if (lessonType.toLowerCase() === 'quiz') {
                // console.log('Setting appState to quiz_ready for quiz');
                setAppState('quiz_ready');
            } else {
                // console.log('Setting appState to idle (fallback)');
                // Fallback
                setAppState('idle');
            }
        } catch (error: any) {
            console.error('Error loading lesson data:', error);
            setAppState('error');
            setErrorMessage(error.message || 'Không thể tải dữ liệu bài học.');
        }
    }, []);

    const loadCourseData = useCallback(async () => {
        try {
            const courseLessons = await getLessons(courseId);
            // console.log('Loaded lessons:', courseLessons);
            setLessons(courseLessons);

            // Set first lesson as current
            if (courseLessons.length > 0) {
                // console.log('Setting current lesson:', courseLessons[0]);
                setCurrentLesson(courseLessons[0]);
                // DO NOT toggle appState here to avoid unnecessary unmounting of the player.
                // appState will be set by loadLessonData based on lesson type or by handleLessonSelect when user switches lessons.
            } else {
                // No lessons available
                setAppState('idle');
            }
        } catch (error: any) {
            // console.error('Error in loadCourseData:', error);
            setAppState('error');
            setErrorMessage(error.message || 'Không thể tải dữ liệu Space.');
        }
    }, [courseId]);

    useEffect(() => {
        loadCourseData();
        loadUser();
        setFocusMode(localStorage.getItem('focusMode') === '1');
    }, [loadCourseData, loadUser]);

    const toggleFocusMode = () => {
        setFocusMode(prev => {
            const next = !prev;
            localStorage.setItem('focusMode', next ? '1' : '0');
            return next;
        });
    };

    useEffect(() => {
        if (currentLesson) {
            loadLessonData(currentLesson.id, currentLesson.type);
        }
    }, [currentLesson, loadLessonData]);

    // WP1.5.3: `lessonProgress` (which carries the resume position) loads
    // asynchronously and can arrive after the plain-<video> element already
    // fired `onLoadedMetadata` — the one-shot seek there can race and miss.
    // Re-apply the seek whenever progress lands, as long as playback hasn't
    // moved past a few seconds yet (don't yank the learner back mid-watch).
    useEffect(() => {
        const resumeAt = lessonProgress?.currentPosition || 0;
        const el = videoRef.current;
        if (el && resumeAt > 0 && el.currentTime < 1 && el.readyState >= 1) {
            el.currentTime = resumeAt;
        }
    }, [lessonProgress]);

    const handleLessonSelect = (lesson: Lesson) => {
        // Reset progress tracking state
        lastSentTimeRef.current = 0;

        // Reset video states
        setVideoDuration(0);
        // Avoid flashing the previous lesson's position while the new one
        // loads — loadLessonData reseeds this from the new lesson's saved
        // progress once it lands.
        setLivePosition(0);

        setCurrentLesson(lesson);
        setQuizSession(null);
        setQuizResult(null);
        setAnswers({});
        setQuizQIdx(0);
        setAppState('loading');
    };

    // WP1.5.13 — every place that navigates away from a playing video
    // (auto-advance on end, manually picking another lesson) now goes
    // through this one function, so the current position is always flushed
    // before the player unmounts. Previously only a true page unload
    // (beforeunload, inside YoutubePlayer/VimeoPlayer) flushed; switching
    // lessons within the SPA relied entirely on the last periodic 5s-delta
    // sync, which for a lesson shorter than that window (or one that ends
    // right after a sync tick) could mean the final watch position — and for
    // very short videos, the 80% completion mark itself — was never sent.
    // This is an in-app transition (not an unload race), so a normal
    // awaited call is fine here — no need for the keepalive/beacon path.
    const switchLesson = useCallback(async (next: Lesson) => {
        if (currentLesson?.type?.toLowerCase() === 'video') {
            const t = playerHandleRef.current?.getCurrentTime() ?? videoRef.current?.currentTime;
            if (typeof t === 'number' && Number.isFinite(t)) {
                try {
                    const progress = await updateLessonProgress(currentLesson.id, Math.floor(t), videoDuration);
                    setProgressSyncError(false);
                    if (progress?.isCompleted) markLessonCompleted(currentLesson.id);
                } catch (err) {
                    console.error('Flush-on-switch error:', err);
                    setProgressSyncError(true);
                }
            }
        }
        handleLessonSelect(next);
    }, [currentLesson, videoDuration, markLessonCompleted]);

    // WP1.5.3: no lesson auto-advanced to the next one when its video ended —
    // the learner had to manually pick the next item from the sidebar every
    // single time.
    const handleVideoEnded = useCallback(() => {
        if (!currentLesson) return;
        const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
        const next = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;
        if (next) {
            switchLesson(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLesson, lessons, switchLesson]);

    // WP1.5.14 — this fired on every native `timeupdate` event (browsers emit
    // these several times a second) and hit the API on every single one,
    // completely unthrottled — unlike the YouTube/Vimeo path, which only
    // syncs on a ≥5s position delta. Now matches that same throttle: the
    // display (`livePosition`) still updates every tick locally, but the
    // network/DB write follows the same cadence as the other two players.
    const handleVideoProgress = async () => {
        if (!videoRef.current || !currentLesson) return;

        const currentTime = Math.floor(videoRef.current.currentTime);
        const duration = Math.floor(videoRef.current.duration || 0);
        setLivePosition(currentTime);

        if (Math.abs(currentTime - lastSentTimeRef.current) < 5) return;

        const previousSentTime = lastSentTimeRef.current;
        lastSentTimeRef.current = currentTime;
        try {
            const progress = await updateLessonProgress(currentLesson.id, currentTime, duration);
            setLessonProgress(progress);
            setProgressSyncError(false);
            if (progress?.isCompleted) markLessonCompleted(currentLesson.id);
        } catch (error) {
            // WP1.5.12: was a fully silent fail — surface it instead.
            console.error('Video progress sync error:', error);
            lastSentTimeRef.current = previousSentTime;
            setProgressSyncError(true);
        }
    };

    const handleStartQuiz = async () => {
        if (!currentLesson) return;

        try {
            const session = await startQuiz(currentLesson.id);
            setQuizSession(session);
            setAppState('quiz_doing');

            // Porting logic từ vibe-demo/quiz: nếu có bản nháp cục bộ khớp
            // đúng sessionId server vừa trả (QuizService.startQuiz tái dùng
            // attempt còn sống — chưa nộp, chưa hết 10 phút), khôi phục lại
            // đáp án + câu đang xem thay vì bắt làm lại từ đầu chỉ vì
            // tab bị đóng/reload giữa lúc làm bài.
            const draft = loadQuizDraft(currentLesson.id);
            const questionCount = Array.isArray(session.questions) ? session.questions.length : 0;
            if (draft && draft.sessionId === session.sessionId) {
                setAnswers(draft.answers);
                setQuizQIdx(Math.min(draft.qIdx, Math.max(0, questionCount - 1)));
            } else {
                const initialAnswers: Record<string, string> = {};
                if (Array.isArray(session.questions)) {
                    session.questions.forEach(q => {
                        initialAnswers[q.id] = '';
                    });
                }
                setAnswers(initialAnswers);
                setQuizQIdx(0);
            }
        } catch (error: any) {
            // Previously only set errorMessage without appState — since only
            // the 'error' branch renders errorMessage, a failed start (e.g.
            // NO_QUESTIONS_FOUND) left the UI showing nothing at all, as if
            // the "Bắt đầu" click had silently done nothing.
            setAppState('error');
            setErrorMessage(error.message);
        }
    };

    const handleAnswerChange = (questionId: string, optionId: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    const handleSubmitQuiz = useCallback(async () => {
        if (!currentLesson || !quizSession) return;
        if (isSubmittingQuiz) return; // already submitting — ignore double-click / timer overlap

        setIsSubmittingQuiz(true);
        try {
            const result = await submitQuiz(currentLesson.id, quizSession.sessionId, answers);
            setQuizResult(result);
            setAppState('quiz_result');
            setQuizQIdx(0);
            // Đã nộp — bản nháp cục bộ không còn phản ánh một lượt đang làm,
            // xoá để lần startQuiz kế tiếp (attempt mới) không đọc nhầm đáp
            // án của lượt đã nộp này.
            clearQuizDraft(currentLesson.id);
            // WP1.5.12: submitting a quiz completes the lesson — reflect that
            // in the sidebar/progress-bar `lessons` list right away. Only do
            // this on an actual pass: the backend (LearningProgress.
            // updateQuizResult) only marks is_finished when isPassed, so
            // unconditionally completing here made a failed or timed-out
            // attempt show as "done" in the sidebar until the next refetch
            // silently reverted it.
            if (result.isPassed) {
                markLessonCompleted(currentLesson.id);
            }
        } catch (error: any) {
            // Previously only set errorMessage without appState — since only
            // the 'error' branch renders errorMessage, a failed submit (e.g.
            // a stale/expired session) left the quiz screen looking frozen
            // with no feedback at all.
            setAppState('error');
            setErrorMessage(error.message);
        } finally {
            setIsSubmittingQuiz(false);
        }
    }, [currentLesson, quizSession, answers, markLessonCompleted, isSubmittingQuiz]);

    // WP1.5.4: notes are added (not overwritten) and can carry the video
    // timestamp they were written at, so clicking one later seeks back there.
    const handleAddNote = async () => {
        if (!currentLesson || !noteDraft.trim()) return;

        setIsSavingNote(true);
        try {
            const timestamp = pinToTimestamp
                ? Math.floor(playerHandleRef.current?.getCurrentTime() ?? videoRef.current?.currentTime ?? 0)
                : null;
            const created = await addLessonNote(currentLesson.id, noteDraft, timestamp);
            setNotes(prev => [...prev, created].sort((a, b) => (a.videoTimestampSec ?? -1) - (b.videoTimestampSec ?? -1)));
            setNoteDraft('');
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!currentLesson) return;
        const prevNotes = notes;
        setNotes(prev => prev.filter(n => n.id !== noteId));
        try {
            await deleteLessonNote(currentLesson.id, noteId);
        } catch (error: any) {
            setNotes(prevNotes);
            setErrorMessage(error.message);
        }
    };

    const handleSeekToNote = (note: LessonNote) => {
        if (note.videoTimestampSec == null) return;
        if (playerHandleRef.current) {
            playerHandleRef.current.seekTo(note.videoTimestampSec);
        } else if (videoRef.current) {
            videoRef.current.currentTime = note.videoTimestampSec;
        }
    };

    const startTimer = useCallback(() => {
        if (!quizSession) return;

        const endTime = new Date(quizSession.expiresAt).getTime();
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                // Auto submit when time expires
                handleSubmitQuiz();
            } else {
                quizTimerRef.current = setTimeout(updateTimer, 1000);
            }
        };

        updateTimer();
    }, [quizSession, handleSubmitQuiz]);

    const stopTimer = useCallback(() => {
        if (quizTimerRef.current) {
            clearTimeout(quizTimerRef.current);
            quizTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (quizSession && appState === 'quiz_doing') {
            startTimer();
        } else {
            stopTimer();
        }

        return () => stopTimer();
    }, [quizSession, appState, startTimer, stopTimer]);

    // Porting logic từ vibe-demo/quiz: autosave bản nháp (đáp án + câu đang
    // xem) mỗi khi đổi trong lúc đang làm bài — câu trả lời cho "mất
    // mạng/đóng tab giữa lúc làm bài": không có gì để mất, vì đáp án luôn
    // nằm sẵn trên máy, không phụ thuộc một lần round-trip cuối.
    useEffect(() => {
        if (appState !== 'quiz_doing' || !currentLesson || !quizSession) return;
        saveQuizDraft(currentLesson.id, { sessionId: quizSession.sessionId, answers, qIdx: quizQIdx });
    }, [appState, currentLesson, quizSession, answers, quizQIdx]);

    // vibe-demo: mất mạng giữa lúc làm bài — không mất dữ liệu (autosave ở
    // trên), chỉ cần báo cho học viên biết.
    useEffect(() => {
        setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
        const onOnline = () => setIsOffline(false);
        const onOffline = () => setIsOffline(true);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // vibe-demo (a11y): cập nhật vùng aria-live theo mốc thời gian còn lại,
    // cho screen reader biết sắp hết giờ mà không cần nhìn màn hình — 30s/lần
    // khi còn nhiều thời gian, dày lên 10s/lần trong phút cuối, từng giây
    // trong 10 giây cuối.
    useEffect(() => {
        if (appState !== 'quiz_doing') return;
        const shouldAnnounce =
            (timeLeft > 60 && timeLeft % 30 === 0) ||
            (timeLeft <= 60 && timeLeft > 10 && timeLeft % 10 === 0) ||
            timeLeft <= 10;
        if (shouldAnnounce) setTimerAnnouncement(`Còn ${formatTime(timeLeft)}`);
    }, [appState, timeLeft]);

    const formatTime = (seconds: number) => {
        const s = Math.max(0, Math.floor(seconds || 0));
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(secs)}`;
        }
        return `${minutes}:${pad(secs)}`;
    };

    const calculateCourseProgress = () => {
        if (lessons.length === 0) return 0;
        const completedLessons = lessons.filter(l => l.isCompleted).length;
        return Math.round((completedLessons / lessons.length) * 100);
    };

    const groupedChapters = useMemo(() => {
        const groups: { chapterId: string; chapterTitle: string; chapterOrder: number; lessons: Lesson[] }[] = [];
        const groupMap = new Map<string, { chapterId: string; chapterTitle: string; chapterOrder: number; lessons: Lesson[] }>();

        lessons.forEach((lesson) => {
            const cId = lesson.chapterId || 'default';
            const cTitle = lesson.chapterTitle || 'Nội dung Space';
            const cOrder = lesson.chapterOrder || (groups.length + 1);

            if (!groupMap.has(cId)) {
                const newGroup = { chapterId: cId, chapterTitle: cTitle, chapterOrder: cOrder, lessons: [] };
                groupMap.set(cId, newGroup);
                groups.push(newGroup);
            }
            groupMap.get(cId)!.lessons.push(lesson);
        });

        return groups;
    }, [lessons]);

    return (
        // "Phòng tắt đèn" — room/screen (theme.ts) áp cho NỀN NGOÀI khi
        // focusMode: bg-ink-room thay bg-ink-page. Các card nội dung bên
        // trong (video/quiz/notes) vẫn giữ bg-ink-panel trắng riêng của
        // chúng — "trang giấy vẫn sáng giữa phòng tối", nên không đổi màu
        // chữ/border của bất kỳ card con nào, tránh rủi ro vỡ contrast.
        <div className={`min-h-screen transition-colors duration-500 ${focusMode ? 'bg-ink-room' : 'bg-ink-page'}`}>
            {!focusMode && <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />}

            {/* Lesson Sub-Header — "tắt đèn" cùng phòng khi focusMode: nền/chữ
                chuyển sang cặp màu tối (ink.room + trắng mờ), progress bar
                chuyển sang ink-accentScreen, cùng công thức với vibe-demo/page.tsx. */}
            {/* top-14 (56px) = APP_TOP_BAR_H của Header phía trên khi !focusMode
                (Header trước đây cao h-16/64px — top-16 cũ đã lệch sau khi Header
                đổi sang APP_TOP_BAR_H trong bước "Header→TopNav motif"). */}
            <div className={`border-b sticky z-10 transition-colors duration-500 ${focusMode ? 'top-0 bg-ink-room border-b-[rgba(244,246,252,0.10)]' : 'top-14 bg-ink-panel border-ink-border'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => router.push('/my-learning')}
                                className={`flex-shrink-0 text-sm transition-colors flex items-center gap-1 ${focusMode ? 'text-[rgba(244,246,252,0.45)] hover:text-[rgba(244,246,252,0.85)]' : 'text-ink-textMuted hover:text-ink-text'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                                Quay lại
                            </button>
                            <div className={`hidden sm:block w-px h-5 ${focusMode ? 'bg-[rgba(244,246,252,0.16)]' : 'bg-ink-border'}`}/>
                            <p className={`text-sm font-medium truncate ${focusMode ? 'text-[rgba(244,246,252,0.85)]' : 'text-ink-text'}`}>
                                {currentLesson ? `Bài ${currentLesson.order}: ${currentLesson.title}` : 'Đang tải...'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* WP1.10.4 — trang học trước đây không có link nào về editor;
                                đây là owner đang xem course của mình (route này không public). */}
                            {!focusMode && (
                                <button
                                    onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                    title="Thêm quiz/tóm tắt cho Space này"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-textMuted hover:bg-ink-page transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Chỉnh sửa
                                </button>
                            )}
                            <button
                                onClick={toggleFocusMode}
                                title={focusMode ? 'Thoát chế độ tập trung' : 'Bật chế độ tập trung'}
                                className={`vd-focusable inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode ? 'bg-[rgba(143,166,238,0.14)] text-ink-accentScreen' : 'text-ink-textMuted hover:bg-ink-page'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {focusMode ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"/>
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5h-4m4 0v-4"/>
                                    )}
                                </svg>
                                {focusMode ? 'Thoát tập trung' : 'Tập trung'}
                            </button>
                            <div className={`flex items-center gap-2 text-xs ${focusMode ? 'text-[rgba(244,246,252,0.45)]' : 'text-ink-textMuted'}`}>
                                <div className={`w-24 rounded-full h-1.5 ${focusMode ? 'bg-[rgba(244,246,252,0.16)]' : 'bg-ink-page'}`}>
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${focusMode ? 'bg-ink-accentScreen' : 'bg-ink-accent'}`}
                                        style={{ width: `${calculateCourseProgress()}%` }}
                                    />
                                </div>
                                <span className={`font-medium ${focusMode ? 'text-ink-accentScreen' : 'text-ink-accent'}`}>{calculateCourseProgress()}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* lg:grid-cols-[1fr_340px] — sidebar giữ chiều rộng cố định 340px
                    khớp lưới của vibe-demo/quiz (1fr/340px), thay tỉ lệ 3:1 co dãn
                    theo % cũ: playlist đọc tên bài dài không bị bóp hẹp dần trên
                    màn rộng, và không quá rộng lãng phí trên màn hẹp hơn. */}
                <div className={`grid grid-cols-1 gap-6 ${focusMode ? '' : 'lg:grid-cols-[1fr_340px]'}`}>
                    {/* Main Content Area */}
                    <div className="space-y-4 min-w-0">
                        {/* Video Player or Quiz Area */}
                        <div className="bg-ink-panel rounded-ink-md border border-ink-border shadow-ink-sm p-6">
                            {/* WP1.5.7: switching lessons (or the very first load) used to
                                unmount the whole page — header, sidebar, progress bar — behind
                                a bare centered spinner. Now only this card swaps to a skeleton;
                                the rest of the layout (sidebar, header) stays mounted, matching
                                the pattern already used in courses/[id]/page.tsx. */}
                            {appState === 'loading' && (
                                <div className="space-y-4">
                                    <Skeleton className="h-64 rounded-ink-md bg-ink-page" />
                                    <Skeleton className="h-4 w-1/3 bg-ink-page" />
                                    <Skeleton className="h-4 w-2/3 bg-ink-page" />
                                </div>
                            )}
                            {/* Keep the video DOM mounted to avoid re-mounts caused by transient appState changes */}
                            <div className={appState === 'idle' ? 'block' : 'hidden'}>
                                {currentLesson?.type?.toLowerCase() === 'video' && (
                                    <div>
                                        {currentLesson.videoUrl && isYouTubeUrl(currentLesson.videoUrl) ? (
                                            <YoutubePlayer
                                                key={currentLesson.id}
                                                ref={playerHandleRef}
                                                videoId={youtubeVideoId || ''}
                                                initialPos={lessonProgress?.currentPosition || 0}
                                                onProgress={handleProgressUpdate}
                                                onDuration={handleDurationUpdate}
                                                onFlush={handleFlushUpdate}
                                                onEnded={handleVideoEnded}
                                            />
                                        ) : currentLesson.videoUrl && isVimeoUrl(currentLesson.videoUrl) ? (
                                            <VimeoPlayer
                                                key={currentLesson.id}
                                                ref={playerHandleRef}
                                                videoId={vimeoVideoId || ''}
                                                initialPos={lessonProgress?.currentPosition || 0}
                                                onProgress={handleProgressUpdate}
                                                onDuration={handleDurationUpdate}
                                                onFlush={handleFlushUpdate}
                                                onEnded={handleVideoEnded}
                                            />
                                        ) : (
                                            <video
                                                key={currentLesson.id}
                                                ref={videoRef}
                                                controls
                                                className="w-full rounded-lg"
                                                onTimeUpdate={handleVideoProgress}
                                                onEnded={() => { handleVideoProgress(); handleVideoEnded(); }}
                                                onLoadedMetadata={() => {
                                                    if (videoRef.current) {
                                                        setVideoDuration(Math.floor(videoRef.current.duration));
                                                        // WP1.5.3: resume-position only worked on the YouTube
                                                        // branch — a plain <video> lesson always restarted at 0.
                                                        const resumeAt = lessonProgress?.currentPosition || 0;
                                                        if (resumeAt > 0) {
                                                            videoRef.current.currentTime = resumeAt;
                                                        }
                                                    }
                                                }}
                                            >
                                                {currentLesson.videoUrl && (
                                                    <source src={currentLesson.videoUrl} type="video/mp4" />
                                                )}
                                                Trình duyệt của bạn không hỗ trợ video.
                                            </video>
                                        )}
                                        {lessonProgress && (
                                            <div className="mt-3 text-xs text-ink-textDim">
                                                Tiến độ: {formatTime(livePosition)} / {formatTime(videoDuration || currentLesson.duration || 0)}
                                            </div>
                                        )}
                                        {progressSyncError && (
                                            <div className="vd-ink-in mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                                Chưa lưu được tiến độ, đang thử lại...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {appState === 'quiz_ready' && currentLesson?.type?.toLowerCase() === 'quiz' && (
                                <div className="flex flex-col items-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-ink-accentA flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-ink-text mb-2">
                                        Bài kiểm tra
                                    </h3>
                                    <p className="text-sm text-ink-textMuted mb-6">
                                        Bạn đã sẵn sàng làm bài kiểm tra chưa?
                                    </p>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="vd-focusable inline-flex items-center gap-2 px-5 py-2.5 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Bắt đầu làm bài
                                    </button>
                                </div>
                            )}

                            {appState === 'quiz_doing' && quizSession && (() => {
                                const questions = quizSession.questions || [];
                                const total = questions.length;
                                const question = questions[quizQIdx];
                                const answeredCount = questions.filter(q => !!answers[q.id]).length;
                                const low = timeLeft <= 60;
                                return (
                                    <div>
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-ink-border">
                                            <h3 className="text-base font-semibold text-ink-text">
                                                Bài kiểm tra
                                            </h3>
                                            <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-full ${low ? 'bg-red-50 text-red-600' : 'bg-ink-page text-ink-textMid'}`}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                                {formatTime(timeLeft)}
                                                {/* vibe-demo (a11y): đồng hồ hiện trên vẫn im lặng với screen
                                                    reader (đổi mỗi giây, không nên đọc mỗi lần) — vùng này mới
                                                    là nơi đọc to theo mốc thời gian. */}
                                                <span role="status" aria-live="polite" className="sr-only">
                                                    {timerAnnouncement}
                                                </span>
                                            </div>
                                        </div>

                                        {/* vibe-demo: mất mạng giữa lúc thi — dữ liệu vẫn an toàn (autosave
                                            localStorage phía trên), chỉ cần nói rõ để học viên không hoảng
                                            khi thấy mất kết nối giữa lúc làm bài. */}
                                        {isOffline && (
                                            <div className="vd-ink-in mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-wrongA text-ink-wrong text-xs font-medium">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                                                </svg>
                                                Mất kết nối — câu trả lời vẫn được lưu tại máy, không mất dữ liệu.
                                            </div>
                                        )}

                                        {total === 0 && (
                                            <p className="text-sm text-ink-textDim italic">Không có câu hỏi nào cho bài tập này.</p>
                                        )}

                                        {question && (
                                            <>
                                                <p className="text-sm font-medium text-ink-text mb-3">
                                                    Câu {quizQIdx + 1}/{total}: {question.text}
                                                </p>
                                                <div className="space-y-2">
                                                    {(question.options || []).map(option => (
                                                        <label key={option.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[question.id] === option.id ? 'border-ink-accent bg-ink-accentA' : 'border-ink-border hover:bg-ink-page'}`}>
                                                            <input
                                                                type="radio"
                                                                name={`question-${question.id}`}
                                                                value={option.id}
                                                                checked={answers[question.id] === option.id}
                                                                onChange={() => handleAnswerChange(question.id, option.id)}
                                                                className="text-ink-accent focus:ring-ink-accent"
                                                            />
                                                            <span className="text-sm text-ink-text">{option.text}</span>
                                                        </label>
                                                    ))}
                                                </div>

                                                {/* Porting logic từ vibe-demo/quiz (renderQuestionMap): lưới
                                                    điều hướng câu hỏi — bấm để nhảy thẳng tới câu bất kỳ, thấy
                                                    ngay câu nào đã trả lời mà không cần cuộn qua toàn bộ đề. */}
                                                <div className="flex flex-wrap gap-1.5 mt-6 pt-5 border-t border-ink-border">
                                                    {questions.map((q, i) => {
                                                        const isCurrent = i === quizQIdx;
                                                        const isAnswered = !!answers[q.id];
                                                        return (
                                                            <button
                                                                key={q.id}
                                                                onClick={() => setQuizQIdx(i)}
                                                                aria-label={`Câu ${i + 1}${isAnswered ? ', đã trả lời' : ', chưa trả lời'}`}
                                                                aria-current={isCurrent ? 'true' : undefined}
                                                                className={`vd-focusable w-8 h-8 rounded-ink-sm border text-[11px] font-mono font-semibold transition-colors ${
                                                                    isCurrent
                                                                        ? 'border-ink-accent bg-ink-accentA text-ink-accent ring-2 ring-ink-accent/25'
                                                                        : isAnswered
                                                                            ? 'border-ink-accent/50 bg-ink-accentA/60 text-ink-accent'
                                                                            : 'border-ink-border text-ink-textDim hover:bg-ink-page'
                                                                }`}
                                                            >
                                                                {String(i + 1).padStart(2, '0')}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-5 flex items-center gap-2.5">
                                                    <button
                                                        onClick={() => setQuizQIdx(i => Math.max(0, i - 1))}
                                                        disabled={quizQIdx === 0}
                                                        className="vd-focusable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink-border text-xs font-medium text-ink-textMid disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-page transition-colors"
                                                    >
                                                        ← Trước
                                                    </button>
                                                    <button
                                                        onClick={() => setQuizQIdx(i => Math.min(total - 1, i + 1))}
                                                        disabled={quizQIdx === total - 1}
                                                        className="vd-focusable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink-border text-xs font-medium text-ink-textMid disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-page transition-colors"
                                                    >
                                                        Sau →
                                                    </button>
                                                    <span className="text-xs text-ink-textDim ml-1">{answeredCount}/{total} đã trả lời</span>
                                                    <button
                                                        onClick={handleSubmitQuiz}
                                                        disabled={isSubmittingQuiz}
                                                        className="vd-focusable ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-ink-accent hover:bg-ink-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        {isSubmittingQuiz ? 'Đang nộp…' : 'Nộp bài'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}

                            {appState === 'quiz_result' && quizResult && (() => {
                                const total = (quizResult.questions || []).length;
                                const correctCount = (quizResult.questions || []).filter(q => q.selectedId === q.correctId).length;
                                return (
                                // vd-ink-in — "hạ mực": kết quả chấm bài là trạng thái vừa xuất
                                // hiện (bút chấm của giáo viên), nên có animation ink-drop-in
                                // giống vibe-demo, có prefers-reduced-motion guard sẵn ở globals.css.
                                <div className="vd-ink-in">
                                    <div className="text-center mb-6 pb-6 border-b border-ink-border">
                                        <h3 className="text-base font-semibold text-ink-text mb-3">
                                            Kết quả bài kiểm tra
                                        </h3>
                                        {/* Was thresholded on `score >= 50` — a leftover from before the
                                            80% pass rule (Rule 27) existed. A student scoring e.g. 60%
                                            saw this badge in the same green "success" color as a real
                                            pass, with no text anywhere on this screen saying whether they
                                            actually passed (`quizResult.isPassed`, which the backend
                                            computes at >= 80%, was never even read here) — the color was
                                            actively lying about the result. */}
                                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${quizResult.isPassed ? 'bg-ink-correctA text-ink-correct' : 'bg-ink-wrongA text-ink-wrong'}`}>
                                            {quizResult.score}
                                        </div>
                                        <p className="text-xs text-ink-textDim mt-2">/ 100 điểm{total > 0 ? ` · ${correctCount}/${total} câu đúng` : ''}</p>
                                        <p className={`text-sm font-semibold mt-2 ${quizResult.isPassed ? 'text-ink-correct' : 'text-ink-wrong'}`}>
                                            {quizResult.isPassed ? '✓ Đạt' : '✗ Chưa đạt (cần từ 80 điểm trở lên)'}
                                        </p>
                                    </div>

                                    {/* Porting logic từ vibe-demo/quiz (renderResult): bản đồ đúng/sai
                                        thu nhỏ + tách "Xem đáp án" (lật từng câu) khỏi "Làm lại" (nộp
                                        thêm một lượt mới), thay vì đổ hết bài chấm ra ngay dưới điểm số. */}
                                    {total > 0 && (
                                        <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                                            {(quizResult.questions || []).map((q, i) => {
                                                const ok = q.selectedId === q.correctId;
                                                return (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => { setQuizQIdx(i); setAppState('quiz_review'); }}
                                                        aria-label={`Câu ${i + 1}, ${ok ? 'đúng' : 'sai'}`}
                                                        className={`vd-focusable w-8 h-8 rounded-ink-sm border text-[11px] font-mono font-semibold transition-colors ${ok ? 'border-ink-correct bg-ink-correctA text-ink-correct' : 'border-ink-wrong bg-ink-wrongA text-ink-wrong'}`}
                                                    >
                                                        {String(i + 1).padStart(2, '0')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="flex justify-center gap-2.5">
                                        {total > 0 && (
                                            <button
                                                onClick={() => { setQuizQIdx(0); setAppState('quiz_review'); }}
                                                className="vd-focusable inline-flex items-center gap-2 px-5 py-2.5 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Xem đáp án
                                            </button>
                                        )}
                                        <button
                                            onClick={handleStartQuiz}
                                            className="vd-focusable inline-flex items-center gap-2 px-5 py-2.5 border border-ink-border text-ink-textMid hover:bg-ink-page text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Làm lại
                                        </button>
                                    </div>

                                    {total === 0 && (
                                        <p className="text-center text-sm text-ink-textDim mt-4">Không có dữ liệu xem lại câu hỏi.</p>
                                    )}
                                </div>
                                );
                            })()}

                            {appState === 'quiz_review' && quizResult && (() => {
                                const questions = quizResult.questions || [];
                                const total = questions.length;
                                const question = questions[quizQIdx];
                                if (!question) return null;
                                return (
                                    <div>
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-ink-border">
                                            <h3 className="text-base font-semibold text-ink-text">
                                                Đáp án &amp; giải thích
                                            </h3>
                                            <span className="text-xs font-mono font-medium text-ink-textDim">{quizQIdx + 1}/{total}</span>
                                        </div>

                                        <p className="text-sm font-medium text-ink-text mb-3">
                                            Câu {quizQIdx + 1}: {question.text}
                                        </p>
                                        <div className="space-y-1.5 mb-6">
                                            {(question.options || []).map(option => (
                                                <div
                                                    key={option.id}
                                                    className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${option.id === question.correctId
                                                        ? 'bg-ink-correctA text-ink-correct font-medium'
                                                        : option.id === question.selectedId && option.id !== question.correctId
                                                            ? 'bg-ink-wrongA text-ink-wrong'
                                                            : 'text-ink-textMid'
                                                        }`}
                                                >
                                                    {option.id === question.correctId ? (
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                                    ) : option.id === question.selectedId && option.id !== question.correctId ? (
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                                    ) : (
                                                        <span className="w-4 h-4 flex-shrink-0"/>
                                                    )}
                                                    {option.text}
                                                </div>
                                            ))}
                                            {question.selectedId == null && (
                                                <p className="text-xs text-ink-wrong font-medium pt-1">Chưa trả lời.</p>
                                            )}
                                        </div>

                                        {/* Porting logic từ vibe-demo/quiz (renderQuestionMap graded=true):
                                            bấm để nhảy thẳng tới câu bất kỳ trong lúc lật đáp án. */}
                                        <div className="flex flex-wrap gap-1.5 mb-5 pt-4 border-t border-ink-border">
                                            {questions.map((q, i) => {
                                                const ok = q.selectedId === q.correctId;
                                                const isCurrent = i === quizQIdx;
                                                return (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => setQuizQIdx(i)}
                                                        aria-label={`Câu ${i + 1}, ${ok ? 'đúng' : 'sai'}`}
                                                        aria-current={isCurrent ? 'true' : undefined}
                                                        className={`vd-focusable w-8 h-8 rounded-ink-sm border text-[11px] font-mono font-semibold transition-colors ${ok ? 'border-ink-correct bg-ink-correctA text-ink-correct' : 'border-ink-wrong bg-ink-wrongA text-ink-wrong'} ${isCurrent ? 'ring-2 ring-ink-accent/25' : ''}`}
                                                    >
                                                        {String(i + 1).padStart(2, '0')}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center gap-2.5">
                                            <button
                                                onClick={() => setQuizQIdx(i => Math.max(0, i - 1))}
                                                disabled={quizQIdx === 0}
                                                className="vd-focusable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink-border text-xs font-medium text-ink-textMid disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-page transition-colors"
                                            >
                                                ← Trước
                                            </button>
                                            <button
                                                onClick={() => setQuizQIdx(i => Math.min(total - 1, i + 1))}
                                                disabled={quizQIdx === total - 1}
                                                className="vd-focusable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-ink-border text-xs font-medium text-ink-textMid disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink-page transition-colors"
                                            >
                                                Sau →
                                            </button>
                                            <button
                                                onClick={() => setAppState('quiz_result')}
                                                className="vd-focusable ml-auto inline-flex items-center gap-2 px-4 py-2 border border-ink-border text-ink-textMid hover:bg-ink-page text-xs font-medium rounded-lg transition-colors"
                                            >
                                                ← Kết quả
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {appState === 'error' && (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-ink-text mb-1">
                                        Có lỗi xảy ra
                                    </h3>
                                    <p className="text-sm text-ink-textMuted">
                                        {errorMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Notes Section - WP1.5.4: many notes per lesson now, each
                            optionally pinned to the video timestamp it was written
                            at (click a note to jump the player back there). */}
                        {currentLesson?.type?.toLowerCase() === 'video' && (
                            <div className="bg-ink-panel rounded-ink-md border border-ink-border shadow-ink-sm p-6">
                                <h3 className="text-sm font-semibold text-ink-text mb-3">
                                    Ghi chú bài học
                                </h3>

                                {notes.length > 0 && (
                                    <ul className="space-y-2 mb-4">
                                        {notes.map(note => (
                                            // border-l-ink-marginLn — "đường kẻ lề vở": motif cấu trúc
                                            // chung của playlist & notes trong theme.ts, đánh dấu mỗi
                                            // ghi chú như một dòng viết bên lề trang vở.
                                            <li key={note.id} className="flex items-start gap-2 p-3 rounded-lg border border-ink-border border-l-2 border-l-ink-marginLn group">
                                                <div className="flex-1 min-w-0">
                                                    {note.videoTimestampSec != null && (
                                                        <button
                                                            onClick={() => handleSeekToNote(note)}
                                                            className="text-xs font-mono font-medium text-ink-accent hover:underline mb-1"
                                                        >
                                                            ⏱ {formatTime(note.videoTimestampSec)}
                                                        </button>
                                                    )}
                                                    <p className="text-sm text-ink-text whitespace-pre-wrap break-words">{note.content}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    title="Xoá ghi chú"
                                                    className="flex-shrink-0 text-ink-textDim hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <textarea
                                    value={noteDraft}
                                    onChange={(e) => setNoteDraft(e.target.value)}
                                    placeholder="Nhập ghi chú mới..."
                                    rows={3}
                                    maxLength={1000}
                                    className="w-full px-3 py-2.5 border border-ink-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent resize-none"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <label className="inline-flex items-center gap-1.5 text-xs text-ink-textMuted">
                                        <input
                                            type="checkbox"
                                            checked={pinToTimestamp}
                                            onChange={(e) => setPinToTimestamp(e.target.checked)}
                                            className="rounded text-ink-accent focus:ring-ink-accent"
                                        />
                                        Gắn vào thời điểm hiện tại của video
                                    </label>
                                    <span className="text-xs text-ink-textDim">{noteDraft.length}/1000</span>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={isSavingNote || !noteDraft.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-ink-accent hover:bg-ink-accent/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {isSavingNote ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                Đang lưu...
                                            </>
                                        ) : 'Thêm ghi chú'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quyết định UX 2026-08-21: trang học KHÔNG trigger AI trực
                            tiếp nữa (AIGenerationPanel cũ đã gỡ) — mọi tính năng AI
                            (tạo quiz thành bài học thật, tóm tắt, tuỳ biến/BYOK) sống
                            ở trang chỉnh sửa. Ở đây chỉ điều hướng — route này
                            owner-only nên nút edit luôn hợp lệ. */}
                        {!focusMode && (
                            <div className="bg-ink-panel rounded-ink-md border border-ink-border shadow-ink-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-ink-text flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                        </svg>
                                        Tóm tắt &amp; quiz bằng AI
                                    </h3>
                                    <p className="text-xs text-ink-textMuted mt-1">
                                        Tạo bài quiz từ video trong Space này — quiz sẽ thành bài học thật, ngay trong trình chỉnh sửa.
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-ink-accent text-white hover:bg-ink-accent/90 transition-colors"
                                >
                                    Mở trình chỉnh sửa
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Lesson List (hidden in focus mode — no distraction from the current lesson) */}
                    {!focusMode && (
                    <div className="min-w-0">
                        <div className="bg-ink-panel rounded-ink-lg border border-ink-border shadow-ink-sm p-4 sticky top-28 space-y-4">
                            <div className="flex items-center justify-between border-b border-ink-border pb-3">
                                <h3 className="text-xs font-bold text-ink-text uppercase tracking-wider">
                                    Nội dung Space
                                </h3>
                                <span className="text-xs text-ink-textDim font-medium">
                                    {lessons.filter(l => l.isCompleted).length}/{lessons.length} bài
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                                {groupedChapters.map((chapterGroup, cIdx) => (
                                    <div key={chapterGroup.chapterId || cIdx} className="space-y-1.5">
                                        {/* Chapter Header — WP1.10.5: course có đúng 1 chương thì ẩn
                                            tầng chương, in phẳng danh sách bài (khớp luật ở share/editor). */}
                                        {groupedChapters.length > 1 && (
                                            <div className="flex items-center gap-2 px-1 py-1">
                                                <span className="text-[11px] font-bold text-ink-accent bg-ink-accentA px-2 py-0.5 rounded-md flex-shrink-0">
                                                    Chương {chapterGroup.chapterOrder || (cIdx + 1)}
                                                </span>
                                                <span className="text-xs font-semibold text-ink-text truncate">
                                                    {chapterGroup.chapterTitle}
                                                </span>
                                            </div>
                                        )}

                                        {/* Lessons List */}
                                        <div className="space-y-1 pl-1">
                                            {chapterGroup.lessons.map((lesson, lIdx) => {
                                                const isSelected = currentLesson?.id === lesson.id;
                                                const lessonNum = lesson.order || (lIdx + 1);
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => switchLesson(lesson)}
                                                        // border-l-ink-marginLn — "đường kẻ lề vở" cho danh sách
                                                        // bài học (playlist), khớp motif đã dùng ở notes phía trên.
                                                        className={`w-full text-left p-2.5 rounded-ink-md transition-all flex items-start gap-2.5 border-l-2 border-l-ink-marginLn ${
                                                            isSelected
                                                                ? 'bg-ink-accentA text-ink-text border-y border-r border-ink-border shadow-ink-sm font-semibold'
                                                                : 'hover:bg-ink-page text-ink-text border-y border-r border-transparent'
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                                                            lesson.isCompleted
                                                                ? 'bg-ink-accent border-ink-accent'
                                                                : isSelected
                                                                    ? 'border-ink-accent bg-ink-panel'
                                                                    : 'border-ink-border'
                                                        }`}>
                                                            {lesson.isCompleted ? (
                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                                                </svg>
                                                            ) : (
                                                                <span className="text-[10px] text-ink-textDim font-mono">
                                                                    {lessonNum}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs leading-snug truncate">
                                                                <span className="font-semibold text-ink-text mr-1">Bài {lessonNum}:</span>
                                                                {lesson.title}
                                                            </p>
                                                            <p className="text-[10px] text-ink-textDim mt-0.5">
                                                                {lesson.type.toLowerCase() === 'video' ? '📹 Video' : '📝 Quiz'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* WP1.10.4 — cue theo thời điểm: hiện ngay sau khi 1 lesson
                                vừa được đánh dấu hoàn thành, không phụ thuộc 1 lần bấm đúng
                                lúc tạo course. */}
                            {showQuizCue && (
                                <div className="vd-ink-in flex items-start gap-2 p-2.5 rounded-ink-md bg-ink-accentA border border-ink-border">
                                    <p className="flex-1 text-xs text-ink-text leading-snug">
                                        Đã xong video. Tạo quiz để ôn lại?
                                    </p>
                                    <button
                                        onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                        className="text-xs font-semibold text-ink-accent hover:text-ink-accent/80 flex-shrink-0"
                                    >
                                        Tạo ngay
                                    </button>
                                    <button
                                        onClick={() => setShowQuizCue(false)}
                                        className="text-ink-textMuted hover:text-ink-text flex-shrink-0"
                                        title="Đóng"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Thẻ tĩnh thường trực — không phụ thuộc trạng thái hoàn thành */}
                            <button
                                onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                className="w-full text-left p-2.5 rounded-ink-md border border-dashed border-ink-border text-xs font-medium text-ink-textMuted hover:border-ink-accent hover:text-ink-accent hover:bg-ink-accentA transition-colors"
                            >
                                + Thêm quiz/tóm tắt cho bài này
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
}
