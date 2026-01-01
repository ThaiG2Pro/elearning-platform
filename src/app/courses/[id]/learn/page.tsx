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
    }, [currentLesson?.id]);

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
    }, [currentLesson?.id, videoDuration]);

    const handleFlushUpdate = useCallback(async (time: number) => {
        const roundedTime = Math.floor(time);
        if (!currentLesson) return;

        console.log('>>> [Flush] Lưu tiến độ cuối cùng:', roundedTime);
        try {
            await updateLessonProgress(currentLesson.id, roundedTime, videoDuration);
        } catch (err) {
            console.error('Flush Error:', err);
        }
    }, [currentLesson?.id, videoDuration]);

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

    useEffect(() => {
        loadCourseData();
        loadUser();
    }, [courseId]);

    const loadUser = () => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    };

    useEffect(() => {
        if (currentLesson) {
            console.log('Loading lesson data for lesson:', currentLesson.id, currentLesson.type);
            loadLessonData(currentLesson.id, currentLesson.type);
        }
    }, [currentLesson]);

    useEffect(() => {
        if (quizSession && appState === 'quiz_doing') {
            startTimer();
        } else {
            stopTimer();
        }

        return () => stopTimer();
    }, [quizSession, appState]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
        };
    }, []);

    const loadCourseData = async () => {
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
    };

    const loadLessonData = async (lessonId: string, lessonType: string) => {
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
    };

    const handleLessonSelect = (lesson: Lesson) => {
        console.log('Lesson select: Switching to lesson', lesson.id);

        // Reset progress tracking state
        lastSentTimeRef.current = 0;

        // Reset video states
        setVideoDuration(0);

        setCurrentLesson(lesson);
        setQuizSession(null);
        setQuizResult(null);
        setAnswers({});
        setAppState('loading');
    };

    const handleVideoProgress = async () => {
        if (videoRef.current && currentLesson) {
            const currentTime = Math.floor(videoRef.current.currentTime);
            const duration = Math.floor(videoRef.current.duration || 0);
            try {
                const progress = await updateLessonProgress(currentLesson.id, currentTime, duration);
                setLessonProgress(progress);
            } catch (error) {
                // Silent fail for progress updates
            }
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
            setErrorMessage(error.message);
        }
    };

    const handleAnswerChange = (questionId: string, optionId: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    const handleSubmitQuiz = async () => {
        if (!currentLesson || !quizSession) return;

        try {
            const result = await submitQuiz(currentLesson.id, quizSession.sessionId, answers);
            setQuizResult(result);
            setAppState('quiz_result');
        } catch (error: any) {
            setErrorMessage(error.message);
        }
    };

    const handleSaveNote = async () => {
        if (!currentLesson) return;

        setIsSavingNote(true);
        try {
            await saveLessonNote(currentLesson.id, noteContent);
            // Note saved successfully
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsSavingNote(false);
        }
    };

    const startTimer = () => {
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
    };

    const stopTimer = () => {
        if (quizTimerRef.current) {
            clearTimeout(quizTimerRef.current);
            quizTimerRef.current = null;
        }
    };

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* Lesson Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/my-learning')}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                ← Quay lại
                            </button>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    {currentLesson ? `Bài ${currentLesson.order}: ${currentLesson.title}` : 'Đang tải...'}
                                </h1>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span>Tiến độ khóa học:</span>
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${calculateCourseProgress()}%` }}
                                        ></div>
                                    </div>
                                    <span>{calculateCourseProgress()}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Video Player or Quiz Area */}
                        <div className="bg-white rounded-lg shadow-md p-6">
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
                                            <div className="mt-4 text-sm text-gray-600">
                                                Tiến độ: {formatTime(lessonProgress.currentPosition)} / {formatTime(videoDuration || currentLesson.duration || 0)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {appState === 'quiz_ready' && currentLesson?.type?.toLowerCase() === 'quiz' && (
                                <div className="text-center py-12">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                        Bài kiểm tra
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Bạn đã sẵn sàng làm bài kiểm tra chưa?
                                    </p>
                                    <button
                                        onClick={handleStartQuiz}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        Bắt đầu làm bài
                                    </button>
                                </div>
                            )}

                            {appState === 'quiz_doing' && quizSession && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Bài kiểm tra
                                        </h3>
                                        <div className="text-lg font-mono text-red-600">
                                            Thời gian còn lại: {formatTime(timeLeft)}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {(quizSession.questions || []).map((question, index) => (
                                            <div key={question.id} className="border-b pb-4">
                                                <h4 className="font-medium text-gray-900 mb-3">
                                                    Câu {index + 1}: {question.text}
                                                </h4>
                                                <div className="space-y-2">
                                                    {(question.options || []).map(option => (
                                                        <label key={option.id} className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                name={`question-${question.id}`}
                                                                value={option.id}
                                                                checked={answers[question.id] === option.id}
                                                                onChange={() => handleAnswerChange(question.id, option.id)}
                                                                className="mr-3"
                                                            />
                                                            <span className="text-gray-700">{option.text}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {(!quizSession.questions || quizSession.questions.length === 0) && (
                                            <p className="text-gray-500 italic">Không có câu hỏi nào cho bài tập này.</p>
                                        )}
                                    </div>

                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={handleSubmitQuiz}
                                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                        >
                                            Nộp bài
                                        </button>
                                    </div>
                                </div>
                            )}

                            {appState === 'quiz_result' && quizResult && (
                                <div>
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                                            Kết quả bài kiểm tra
                                        </h3>
                                        <div className="text-4xl font-bold text-blue-600">
                                            {quizResult.score}/100
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {(quizResult.questions || []).map((question, index) => (
                                            <div key={question.id} className="border rounded-lg p-4">
                                                <h4 className="font-medium text-gray-900 mb-2">
                                                    Câu {index + 1}: {question.text}
                                                </h4>
                                                <div className="space-y-1">
                                                    {(question.options || []).map(option => (
                                                        <div
                                                            key={option.id}
                                                            className={`p-2 rounded ${option.id === question.correctId
                                                                ? 'bg-green-100 text-green-800'
                                                                : option.id === question.selectedId && option.id !== question.correctId
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-gray-50'
                                                                }`}
                                                        >
                                                            {option.text}
                                                            {option.id === question.correctId && ' ✓'}
                                                            {option.id === question.selectedId && option.id !== question.correctId && ' ✗'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {(!quizResult.questions || quizResult.questions.length === 0) && (
                                            <p className="text-center text-gray-500">Không có dữ liệu xem lại câu hỏi.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {appState === 'error' && (
                                <div className="text-center py-12">
                                    <div className="text-red-400 mb-4">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Có lỗi xảy ra
                                    </h3>
                                    <p className="text-gray-600">
                                        {errorMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Notes Section - Only show for video lessons */}
                        {currentLesson?.type?.toLowerCase() === 'video' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Ghi chú bài học
                                </h3>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Nhập ghi chú của bạn..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSavingNote}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSavingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Lesson List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Danh sách bài học
                            </h3>
                            <div className="space-y-2">
                                {lessons.map(lesson => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => handleLessonSelect(lesson)}
                                        className={`w-full text-left p-3 rounded-lg border ${currentLesson?.id === lesson.id
                                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                                            : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">
                                                    Bài {lesson.order}: {lesson.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {lesson.type.toLowerCase() === 'video' ? 'Video' : 'Quiz'}
                                                </div>
                                            </div>
                                            {lesson.isCompleted && (
                                                <div className="ml-2">
                                                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
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
