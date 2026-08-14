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

export default function LearningPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;

    // Main states
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
    const [appState, setAppState] = useState<'loading' | 'idle' | 'quiz_ready' | 'quiz_doing' | 'quiz_result' | 'error'>('loading');
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

            // Initialize answers an toàn
            const initialAnswers: Record<string, string> = {};
            if (Array.isArray(session.questions)) {
                session.questions.forEach(q => {
                    initialAnswers[q.id] = '';
                });
            }
            setAnswers(initialAnswers);
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <div className="min-h-screen bg-slate-50">
            {!focusMode && <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />}

            {/* Lesson Sub-Header */}
            <div className={`bg-white border-b border-slate-200 sticky z-10 ${focusMode ? 'top-0' : 'top-16'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => router.push('/my-learning')}
                                className="flex-shrink-0 text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                                Quay lại
                            </button>
                            <div className="hidden sm:block w-px h-5 bg-slate-200"/>
                            <p className="text-sm font-medium text-slate-800 truncate">
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
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
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
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
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
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className="w-24 bg-slate-100 rounded-full h-1.5">
                                    <div
                                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                                        style={{ width: `${calculateCourseProgress()}%` }}
                                    />
                                </div>
                                <span className="font-medium text-blue-600">{calculateCourseProgress()}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className={`grid grid-cols-1 gap-6 ${focusMode ? '' : 'lg:grid-cols-4'}`}>
                    {/* Main Content Area */}
                    <div className={focusMode ? 'space-y-4' : 'lg:col-span-3 space-y-4'}>
                        {/* Video Player or Quiz Area */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            {/* WP1.5.7: switching lessons (or the very first load) used to
                                unmount the whole page — header, sidebar, progress bar — behind
                                a bare centered spinner. Now only this card swaps to a skeleton;
                                the rest of the layout (sidebar, header) stays mounted, matching
                                the pattern already used in courses/[id]/page.tsx. */}
                            {appState === 'loading' && (
                                <div className="space-y-4">
                                    <Skeleton className="h-64 rounded-xl bg-slate-200" />
                                    <Skeleton className="h-4 w-1/3 bg-slate-200" />
                                    <Skeleton className="h-4 w-2/3 bg-slate-200" />
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
                                            <div className="mt-3 text-xs text-slate-400">
                                                Tiến độ: {formatTime(livePosition)} / {formatTime(videoDuration || currentLesson.duration || 0)}
                                            </div>
                                        )}
                                        {progressSyncError && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
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
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-900 mb-2">
                                        Bài kiểm tra
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Bạn đã sẵn sàng làm bài kiểm tra chưa?
                                    </p>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Bắt đầu làm bài
                                    </button>
                                </div>
                            )}

                            {appState === 'quiz_doing' && quizSession && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                        <h3 className="text-base font-semibold text-slate-900">
                                            Bài kiểm tra
                                        </h3>
                                        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-full ${timeLeft <= 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            {formatTime(timeLeft)}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {(quizSession.questions || []).map((question, index) => (
                                            <div key={question.id} className="border-b border-slate-100 pb-5 last:border-0">
                                                <p className="text-sm font-medium text-slate-800 mb-3">
                                                    Câu {index + 1}: {question.text}
                                                </p>
                                                <div className="space-y-2">
                                                    {(question.options || []).map(option => (
                                                        <label key={option.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[question.id] === option.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                            <input
                                                                type="radio"
                                                                name={`question-${question.id}`}
                                                                value={option.id}
                                                                checked={answers[question.id] === option.id}
                                                                onChange={() => handleAnswerChange(question.id, option.id)}
                                                                className="text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm text-slate-700">{option.text}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {(!quizSession.questions || quizSession.questions.length === 0) && (
                                            <p className="text-sm text-slate-400 italic">Không có câu hỏi nào cho bài tập này.</p>
                                        )}
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleSubmitQuiz}
                                            disabled={isSubmittingQuiz}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            {isSubmittingQuiz ? 'Đang nộp…' : 'Nộp bài'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {appState === 'quiz_result' && quizResult && (
                                <div>
                                    <div className="text-center mb-8 pb-6 border-b border-slate-100">
                                        <h3 className="text-base font-semibold text-slate-800 mb-3">
                                            Kết quả bài kiểm tra
                                        </h3>
                                        {/* Was thresholded on `score >= 50` — a leftover from before the
                                            80% pass rule (Rule 27) existed. A student scoring e.g. 60%
                                            saw this badge in the same green "success" color as a real
                                            pass, with no text anywhere on this screen saying whether they
                                            actually passed (`quizResult.isPassed`, which the backend
                                            computes at >= 80%, was never even read here) — the color was
                                            actively lying about the result. */}
                                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${quizResult.isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {quizResult.score}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">/ 100 điểm</p>
                                        <p className={`text-sm font-semibold mt-2 ${quizResult.isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {quizResult.isPassed ? '✓ Đạt' : '✗ Chưa đạt (cần từ 80 điểm trở lên)'}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {(quizResult.questions || []).map((question, index) => (
                                            <div key={question.id} className="border border-slate-200 rounded-xl p-4">
                                                <p className="text-sm font-medium text-slate-800 mb-3">
                                                    Câu {index + 1}: {question.text}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {(question.options || []).map(option => (
                                                        <div
                                                            key={option.id}
                                                            className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${option.id === question.correctId
                                                                ? 'bg-emerald-50 text-emerald-700 font-medium'
                                                                : option.id === question.selectedId && option.id !== question.correctId
                                                                    ? 'bg-red-50 text-red-700'
                                                                    : 'text-slate-600'
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
                                                </div>
                                            </div>
                                        ))}

                                        {(!quizResult.questions || quizResult.questions.length === 0) && (
                                            <p className="text-center text-sm text-slate-400">Không có dữ liệu xem lại câu hỏi.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {appState === 'error' && (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-1">
                                        Có lỗi xảy ra
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {errorMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Notes Section - WP1.5.4: many notes per lesson now, each
                            optionally pinned to the video timestamp it was written
                            at (click a note to jump the player back there). */}
                        {currentLesson?.type?.toLowerCase() === 'video' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                                    Ghi chú bài học
                                </h3>

                                {notes.length > 0 && (
                                    <ul className="space-y-2 mb-4">
                                        {notes.map(note => (
                                            <li key={note.id} className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 group">
                                                <div className="flex-1 min-w-0">
                                                    {note.videoTimestampSec != null && (
                                                        <button
                                                            onClick={() => handleSeekToNote(note)}
                                                            className="text-xs font-mono font-medium text-blue-600 hover:underline mb-1"
                                                        >
                                                            ⏱ {formatTime(note.videoTimestampSec)}
                                                        </button>
                                                    )}
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{note.content}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    title="Xoá ghi chú"
                                                    className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                        <input
                                            type="checkbox"
                                            checked={pinToTimestamp}
                                            onChange={(e) => setPinToTimestamp(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        Gắn vào thời điểm hiện tại của video
                                    </label>
                                    <span className="text-xs text-slate-400">{noteDraft.length}/1000</span>
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={isSavingNote || !noteDraft.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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
                    </div>

                    {/* Sidebar - Lesson List (hidden in focus mode — no distraction from the current lesson) */}
                    {!focusMode && (
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sticky top-28 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Nội dung Space
                                </h3>
                                <span className="text-xs text-slate-400 font-medium">
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
                                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex-shrink-0">
                                                    Chương {chapterGroup.chapterOrder || (cIdx + 1)}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-800 truncate">
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
                                                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                                                            isSelected
                                                                ? 'bg-indigo-50/90 text-indigo-900 border border-indigo-200 shadow-xs font-semibold'
                                                                : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors ${
                                                            lesson.isCompleted
                                                                ? 'bg-emerald-500 border-emerald-500'
                                                                : isSelected
                                                                    ? 'border-indigo-500 bg-white'
                                                                    : 'border-slate-300'
                                                        }`}>
                                                            {lesson.isCompleted ? (
                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                                                </svg>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    {lessonNum}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs leading-snug truncate">
                                                                <span className="font-semibold text-slate-900 mr-1">Bài {lessonNum}:</span>
                                                                {lesson.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">
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
                                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <p className="flex-1 text-xs text-indigo-800 leading-snug">
                                        Đã xong video. Tạo quiz để ôn lại?
                                    </p>
                                    <button
                                        onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex-shrink-0"
                                    >
                                        Tạo ngay
                                    </button>
                                    <button
                                        onClick={() => setShowQuizCue(false)}
                                        className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"
                                        title="Đóng"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Thẻ tĩnh thường trực — không phụ thuộc trạng thái hoàn thành */}
                            <button
                                onClick={() => router.push(`/my-courses/${courseId}/edit`)}
                                className="w-full text-left p-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
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
