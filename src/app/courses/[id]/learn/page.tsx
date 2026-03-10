'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import YoutubePlayer from '@/components/YoutubePlayer';
import { getLessons, getLessonProgress, updateLessonProgress, startQuiz, submitQuiz, saveLessonNote, getLessonNote } from '@/lib/course';
import { Lesson, LessonProgress, QuizSession, QuizResult } from '@/types/course.types';
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

    // UI states
    const [noteContent, setNoteContent] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // YouTube states
    const [videoDuration, setVideoDuration] = useState<number>(0);

    // Progress tracking refs (lesson-bound)
    const lastSentTimeRef = useRef<number>(0);
    const quizTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Video refs
    const videoRef = useRef<HTMLVideoElement>(null);

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

    // Memoize videoId so it doesn't change reference unless the lesson changes
    const youtubeVideoId = useMemo(() => {
        return currentLesson?.videoUrl ? getYouTubeVideoId(currentLesson.videoUrl) : null;
    }, [currentLesson?.videoUrl]);

    // Memoize callbacks to prevent remounting
    const handleProgressUpdate = useCallback(async (currentTime: number) => {
        const roundedTime = Math.floor(currentTime);

        if (Math.abs(roundedTime - lastSentTimeRef.current) >= 5) {
            if (!currentLesson) return;

            // CẬP NHẬT NGAY LẬP TỨC TRƯỚC KHI GỌI API
            // Việc này ngăn các nhịp setInterval sau gửi trùng dữ liệu
            lastSentTimeRef.current = roundedTime;

            console.log('>>> [BE Sync] Gửi tiến độ:', roundedTime);
            try {
                await updateLessonProgress(currentLesson.id, roundedTime, videoDuration);
            } catch (err) {
                console.error('BE Sync Error:', err);
                // Nếu lỗi, có thể reset lại để nhịp sau gửi lại
                // lastSentTimeRef.current = roundedTime - 5;
            }
        }
    }, [currentLesson, videoDuration]);

    const handleFlushUpdate = useCallback(async (time: number) => {
        const roundedTime = Math.floor(time);
        if (!currentLesson) return;

        console.log('>>> [Flush] Lưu tiến độ cuối cùng:', roundedTime);
        try {
            await updateLessonProgress(currentLesson.id, roundedTime, videoDuration);
        } catch (err) {
            console.error('Flush Error:', err);
        }
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
            const [progress, note] = await Promise.all([
                getLessonProgress(lessonId),
                getLessonNote(lessonId)
            ]);

            // console.log('Progress and note loaded:', { progress, note });
            setLessonProgress(progress);
            setNoteContent(note?.content || '');

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
            setErrorMessage(error.message || 'Không thể tải dữ liệu khóa học.');
        }
    }, [courseId]);

    useEffect(() => {
        loadCourseData();
        loadUser();
    }, [loadCourseData, loadUser]);

    useEffect(() => {
        if (currentLesson) {
            console.log('Loading lesson data for lesson:', currentLesson.id, currentLesson.type);
            loadLessonData(currentLesson.id, currentLesson.type);
        }
    }, [currentLesson, loadLessonData]);

    const handleSubmitQuiz = useCallback(async () => {
        if (!currentLesson || !quizSession) return;

        try {
            const result = await submitQuiz(currentLesson.id, quizSession.sessionId, answers);
            setQuizResult(result);
            setAppState('quiz_result');
        } catch (error: any) {
            setErrorMessage(error.message);
        }
    }, [currentLesson, quizSession, answers]);

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

    if (appState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* Lesson Sub-Header */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10">
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
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Video Player or Quiz Area */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            {/* Keep the video DOM mounted to avoid re-mounts caused by transient appState changes */}
                            <div className={appState === 'idle' ? 'block' : 'hidden'}>
                                {currentLesson?.type?.toLowerCase() === 'video' && (
                                    <div>
                                        {currentLesson.videoUrl && isYouTubeUrl(currentLesson.videoUrl) ? (
                                            <YoutubePlayer
                                                key={currentLesson.id}
                                                videoId={youtubeVideoId || ''}
                                                initialPos={lessonProgress?.currentPosition || 0}
                                                onProgress={handleProgressUpdate}
                                                onDuration={handleDurationUpdate}
                                                onFlush={handleFlushUpdate}
                                            />
                                        ) : (
                                            <video
                                                ref={videoRef}
                                                controls
                                                className="w-full rounded-lg"
                                                onTimeUpdate={handleVideoProgress}
                                                onEnded={() => handleVideoProgress()}
                                                onLoadedMetadata={() => {
                                                    if (videoRef.current) {
                                                        setVideoDuration(Math.floor(videoRef.current.duration));
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
                                                Tiến độ: {formatTime(lessonProgress.currentPosition)} / {formatTime(videoDuration || currentLesson.duration || 0)}
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
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Nộp bài
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
                                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${quizResult.score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {quizResult.score}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">/ 100 điểm</p>
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

                        {/* Notes Section - Only show for video lessons */}
                        {currentLesson?.type?.toLowerCase() === 'video' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                                    Ghi chú bài học
                                </h3>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Nhập ghi chú của bạn..."
                                    rows={4}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSavingNote}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {isSavingNote ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                Đang lưu...
                                            </>
                                        ) : 'Lưu ghi chú'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Lesson List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-28">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Danh sách bài học
                            </h3>
                            <div className="space-y-1">
                                {lessons.map(lesson => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => handleLessonSelect(lesson)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${currentLesson?.id === lesson.id
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${lesson.isCompleted ? 'bg-emerald-500 border-emerald-500' : currentLesson?.id === lesson.id ? 'border-blue-400' : 'border-slate-300'}`}>
                                                {lesson.isCompleted && (
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-medium truncate leading-snug ${currentLesson?.id === lesson.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    Bài {lesson.order}: {lesson.title}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {lesson.type.toLowerCase() === 'video' ? 'Video' : 'Quiz'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
