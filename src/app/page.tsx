'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import CourseList from '@/components/CourseList';
import { Button } from '@/components/ui/button';
import { Course, MyLearningCourse } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getCourses } from '@/lib/courses';
import { getMyLearningCourses } from '@/lib/course';
import { createCourseFromLink } from '@/lib/management';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'error' | 'success';
// WP1.5.5: "học tiếp" is its own independent fetch (separate endpoint,
// separate auth requirement) — keeping its loading/empty/error states apart
// from the public-catalog appState above so one doesn't block the other.
type ContinueState = 'idle' | 'loading' | 'loaded' | 'error';

export default function Home() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // WP1.5.5 — "học tiếp" (continue learning) strip for returning users.
    const [continueCourses, setContinueCourses] = useState<MyLearningCourse[]>([]);
    const [continueState, setContinueState] = useState<ContinueState>('idle');

    // WP1.5.5 — prominent paste-link box (the core WP1.1 feature), now
    // reachable straight from the homepage instead of only inside the
    // /my-courses modal.
    const [linkUrl, setLinkUrl] = useState('');
    const [creatingFromLink, setCreatingFromLink] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // WP1.5.12 — extracted so the "Thử lại" button can call it directly.
    // Previously retry did `setDebouncedSearchQuery(searchQuery)`, which is a
    // no-op whenever the two are already equal (the common case right after
    // an error) — React bails out of the state update and the effect below
    // never re-runs, so the button did nothing.
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
        fetchCourses(debouncedSearchQuery); // Always fetch courses, with or without search
    }, [debouncedSearchQuery, fetchCourses]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    // WP1.5.5 — fetch "học tiếp" once we know a user is logged in. Anonymous
    // visitors never hit this endpoint (it requires auth), so this only runs
    // after the user-detection effect above resolves to a real user.
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
                // Non-critical section — fail quietly, don't block the catalog below.
                setContinueState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const handleCreateFromLink = async () => {
        if (!linkUrl.trim()) return;
        setLinkError(null);
        setCreatingFromLink(true);
        try {
            const res = await createCourseFromLink(linkUrl.trim());
            setLinkUrl('');
            router.push(`/my-courses/${res.courseId}/edit`);
        } catch (err: any) {
            const message = err.message;
            if (message === 'UNAUTHORIZED') {
                setLinkError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            } else if (message === 'NETWORK_ERROR' || message === 'SERVER_ERROR') {
                setLinkError('Hệ thống không thể tạo khóa học lúc này, vui lòng thử lại.');
            } else {
                setLinkError(message || 'Lỗi khi tạo khóa học');
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
        } catch (error: any) {
            // Handle logout error if needed
            setUser(null); // Still clear user state
        }
    };

    const handleJoin = () => {
        router.push('/join');
    };

    const handleCourseClick = (courseId: number) => {
        router.push(`/courses/${courseId}`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero / Search Section */}
                <section className="mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Khám phá khóa học</h1>
                            <p className="text-sm text-slate-500 mt-1">Học bất cứ lúc nào — bắt đầu với khóa học phù hợp.</p>
                        </div>
                        <div className="w-full md:max-w-sm">
                            <SearchBar value={searchQuery} onChange={handleSearchChange} />
                        </div>
                    </div>
                </section>

                {/* WP1.5.5 — ô dán link nổi bật: đưa tính năng lõi (dán link
                    -> tự tạo khóa học) ra ngay trang chủ thay vì chỉ nằm
                    trong modal ở /my-courses. */}
                {user && (
                    <section className="mb-8 bg-blue-600 rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="md:flex-shrink-0">
                                <h2 className="text-lg font-bold text-white">Dán link video, tạo khóa học ngay</h2>
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
                                    {creatingFromLink ? 'Đang tạo…' : 'Tạo khóa học'}
                                </Button>
                            </div>
                        </div>
                        {linkError && (
                            <p className="mt-2 text-sm text-blue-50 bg-blue-700/50 rounded-lg px-3 py-2">{linkError}</p>
                        )}
                    </section>
                )}

                {/* WP1.5.5 — "học tiếp": ngữ cảnh khác biệt cho user quay lại
                    so với khách chưa đăng nhập. */}
                {user && continueState !== 'idle' && continueState !== 'error' && (
                    <section className="mb-8">
                        <h2 className="text-base font-semibold text-slate-800 mb-4">Học tiếp</h2>
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
                                        className="text-left bg-white border border-slate-100 rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                    >
                                        <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-1">{course.title}</h3>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1.5">
                                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${course.completionRate}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{course.completionRate}% hoàn thành</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // WP1.5.5 — empty-state cho user mới đăng nhập: khác
                            // hẳn khách vãng lai, không phải "0 kết quả tìm kiếm".
                            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center">
                                <p className="text-sm text-slate-500">Bạn chưa có khóa học nào đang học. Dán link video ở trên hoặc chọn một khóa học bên dưới để bắt đầu.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Course List Section */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800">
                            {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Khóa học nổi bật'}
                        </h2>
                        {appState === 'success' && courses.length > 0 && (
                            <span className="text-xs text-slate-400">{courses.length} khóa học</span>
                        )}
                    </div>

                    <CourseList
                        courses={courses}
                        loading={appState === 'loading'}
                        onCourseClick={handleCourseClick}
                    />

                    <div className="sr-only" aria-live="polite">
                        {appState === 'loading' ? 'Đang tải khóa học...' : ''}
                    </div>

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
                </section>
            </main>
        </div>
    );
}
