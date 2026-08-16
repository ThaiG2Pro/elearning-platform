'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import CourseList from '@/components/CourseList';
import { Button } from '@/components/ui/button';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { Course, MyLearningCourse } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getCourses } from '@/lib/courses';
import { getMyLearningCourses } from '@/lib/course';
import { createCourseFromLink } from '@/lib/management';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';

type AppState = 'idle' | 'loading' | 'error' | 'success';
type ContinueState = 'idle' | 'loading' | 'loaded' | 'error';

export default function Home() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // "Học tiếp" (Continue learning) for returning users
    const [continueCourses, setContinueCourses] = useState<MyLearningCourse[]>([]);
    const [continueState, setContinueState] = useState<ContinueState>('idle');

    // Toggles for 2-tier Discovery sections
    const [showAllShowcase, setShowAllShowcase] = useState(false);
    const [showAllPopular, setShowAllPopular] = useState(false);

    // Paste-link box
    const [linkUrl, setLinkUrl] = useState('');
    const [creatingFromLink, setCreatingFromLink] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [createdSpace, setCreatedSpace] = useState<{ courseId: string; title: string; titleIsPlaceholder: boolean } | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchCourses = useCallback(async (query: string) => {
        try {
            setAppState('loading');
            setErrorMessage(null);
            const data = await getCourses(query || undefined);
            setCourses(data);
            setAppState('success');
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message);
            setCourses([]);
        }
    }, []);

    // Effect for search changes
    useEffect(() => {
        fetchCourses(debouncedSearchQuery);
    }, [debouncedSearchQuery, fetchCourses]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    // Fetch "học tiếp" once we know user is logged in
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            setContinueState('loading');
            try {
                const response = await getMyLearningCourses('in_progress');
                if (cancelled) return;
                setContinueCourses(response.courses);
                setContinueState('loaded');
            } catch {
                if (cancelled) return;
                setContinueState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const isPlaylistUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url)
        && /[?&]list=/.test(url)
        && !/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);

    const handleCreateFromLink = async () => {
        const url = linkUrl.trim();
        if (!url) return;
        if (isPlaylistUrl(url)) {
            setLinkError('Chưa hỗ trợ playlist — dán link từng video.');
            return;
        }
        setLinkError(null);
        setCreatingFromLink(true);
        try {
            const res = await createCourseFromLink(url);
            setLinkUrl('');
            setCreatedSpace(res);
        } catch (err: any) {
            const message = err.message;
            if (message === 'UNAUTHORIZED') {
                setLinkError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            } else if (message === 'NETWORK_ERROR' || message === 'SERVER_ERROR') {
                setLinkError('Hệ thống không thể tạo Space lúc này, vui lòng thử lại.');
            } else {
                setLinkError(message || 'Lỗi khi tạo Space');
            }
        } finally {
            setCreatingFromLink(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
        } catch {
            setUser(null);
        }
    };

    const handleJoin = () => {
        router.push('/join');
    };

    const handleCourseClick = (courseId: number) => {
        router.push(`/courses/${courseId}`);
    };

    // Filter courses for Tầng 1 (Showcase) and Tầng 2 (Lineage Popularity)
    const showcaseCourses = courses.filter((c) => c.isShowcase);
    const popularCourses = [...courses]
        .filter((c) => !c.isShowcase)
        .sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));

    // Fallback if no non-showcase courses exist yet
    const displayPopularCourses = popularCourses.length > 0
        ? popularCourses
        : [...courses].sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero / Search Section */}
                <section className="mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Khám phá Space</h1>
                            <p className="text-sm text-slate-500 mt-1">Học bất cứ lúc nào — bắt đầu với Space phù hợp.</p>
                        </div>
                        <div className="w-full md:max-w-sm">
                            <SearchBar value={searchQuery} onChange={handleSearchChange} />
                        </div>
                    </div>
                </section>

                {/* Paste-link box for logged-in users */}
                {user && !createdSpace && (
                    <section className="mb-8 bg-blue-600 rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="md:flex-shrink-0">
                                <h2 className="text-lg font-bold text-white">Dán link video, tạo Space ngay</h2>
                                <p className="text-sm text-blue-100 mt-0.5">Dán link YouTube — hệ thống tự lấy tiêu đề, ảnh và tạo bài học đầu tiên.</p>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2">
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFromLink(); }}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    disabled={creatingFromLink}
                                    className="flex-1 px-3 py-2.5 rounded-lg border-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-60"
                                />
                                <Button
                                    onClick={handleCreateFromLink}
                                    disabled={creatingFromLink || !linkUrl.trim()}
                                    variant="secondary"
                                    className="whitespace-nowrap"
                                >
                                    {creatingFromLink ? 'Đang tạo…' : 'Tạo Space'}
                                </Button>
                            </div>
                        </div>
                        {linkError && (
                            <p className="mt-2 text-sm text-blue-50 bg-blue-700/50 rounded-lg px-3 py-2">{linkError}</p>
                        )}
                    </section>
                )}

                {/* Card choices after pasting URL */}
                {createdSpace && (
                    <section className="mb-8 bg-white border border-emerald-200 rounded-xl p-6 shadow-sm">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Đã tạo Space</p>
                        <h2 className="text-lg font-bold text-slate-900">{createdSpace.title}</h2>
                        {createdSpace.titleIsPlaceholder && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                                Không đọc được tên video từ YouTube — đã đặt tên tạm, bạn có thể đổi trong phần chỉnh sửa.
                            </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <Button onClick={() => router.push(`/courses/${createdSpace.courseId}/learn`)}>
                                Học ngay
                            </Button>
                            <Button variant="outline" onClick={() => router.push(`/my-courses/${createdSpace.courseId}/edit`)}>
                                Thêm quiz/tóm tắt trước khi học
                            </Button>
                            <Button variant="ghost" onClick={() => setCreatedSpace(null)}>
                                Dán link khác
                            </Button>
                        </div>
                    </section>
                )}

                {/* KHU VỰC 1 (Dành cho User đã Login): "Tiếp tục học" */}
                {user && continueState !== 'idle' && continueState !== 'error' && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Tiếp tục học</h2>
                            <span className="text-xs font-medium text-slate-400">Dành riêng cho bạn</span>
                        </div>
                        {continueState === 'loading' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-white border border-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : continueCourses.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {continueCourses.map((course) => (
                                    <button
                                        key={course.id}
                                        onClick={() => router.push(`/courses/${course.id}/learn`)}
                                        className="text-left bg-white border border-slate-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                    >
                                        <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-1">{course.title}</h3>
                                        {course.completionRate > 0 ? (
                                            <>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${course.completionRate}%` }} />
                                                </div>
                                                <span className="text-xs text-slate-400">{course.completionRate}% hoàn thành</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-blue-600 font-medium">
                                                Đã xem {formatDuration(course.lastWatchedPositionSec || 0)}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
                                <p className="text-sm text-slate-500">Bạn chưa có Space nào đang học. Dán link video ở trên hoặc chọn một Space bên dưới để bắt đầu.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* SEARCH RESULTS MODE vs DISCOVERY MODE */}
                {searchQuery ? (
                    /* Search Results */
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                Kết quả cho &quot;{searchQuery}&quot;
                            </h2>
                            {appState === 'success' && courses.length > 0 && (
                                <span className="text-xs text-slate-400">{courses.length} Space</span>
                            )}
                        </div>

                        <CourseList
                            courses={courses}
                            loading={appState === 'loading'}
                            onCourseClick={handleCourseClick}
                        />
                    </section>
                ) : (
                    /* KHU VỰC 2: "Khám phá Space nổi bật" (2 Tầng) */
                    <div className="space-y-10">
                        {/* TẦNG 1: Space Mẫu (Showcase) — 1 dòng + nút xem tất cả */}
                        {showcaseCourses.length > 0 && (
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-900">Space Tuyển Chọn</h2>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                            Chất lượng cao
                                        </span>
                                    </div>
                                    {showcaseCourses.length > 3 && (
                                        <button
                                            onClick={() => setShowAllShowcase(!showAllShowcase)}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                                        >
                                            {showAllShowcase ? 'Thu gọn ↑' : `Xem tất cả (${showcaseCourses.length}) →`}
                                        </button>
                                    )}
                                </div>

                                <CourseList
                                    courses={showAllShowcase ? showcaseCourses : showcaseCourses.slice(0, 3)}
                                    loading={appState === 'loading'}
                                    onCourseClick={handleCourseClick}
                                />
                            </section>
                        )}

                        {/* TẦNG 2: Space Phổ biến nhất (Cộng đồng) — nhiều hơn 1 dòng (2 dòng = 6 cards) + nút xem tất cả */}
                        {displayPopularCourses.length > 0 && (
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-900">Space Phổ biến nhất</h2>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                            Nhiều người học
                                        </span>
                                    </div>
                                    {displayPopularCourses.length > 6 && (
                                        <button
                                            onClick={() => setShowAllPopular(!showAllPopular)}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                                        >
                                            {showAllPopular ? 'Thu gọn ↑' : `Xem tất cả (${displayPopularCourses.length}) →`}
                                        </button>
                                    )}
                                </div>

                                <CourseList
                                    courses={showAllPopular ? displayPopularCourses : displayPopularCourses.slice(0, 6)}
                                    loading={appState === 'loading'}
                                    onCourseClick={handleCourseClick}
                                />
                            </section>
                        )}
                    </div>
                )}

                {appState === 'error' && errorMessage && (
                    <div className="flex flex-col items-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{errorMessage}</p>
                        <Button
                            variant="link"
                            onClick={() => fetchCourses(debouncedSearchQuery)}
                        >
                            Thử lại
                        </Button>
                    </div>
                )}
            </main>

            {/* ── Sales Agent Widget ─────────────────────────────────────────────
                Appears only in high-intent moments:
                  • Guest viewing homepage → onboarding + intro
                  • Logged-in user with no courses yet → subscription nudge
                Not shown during active search (user is task-focused).
            ──────────────────────────────────────────────────────────────────── */}
            {!searchQuery && (
                !user
                    ? <SalesAgentWidget context="homepage_guest" />
                    : continueState === 'loaded' && continueCourses.length === 0
                        ? <SalesAgentWidget context="homepage_no_courses" userName={user.fullName} />
                        : null
            )}
        </div>
    );
}
