'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getMyLearningCourses } from '@/lib/course';
import { Skeleton } from '@/components/ui/skeleton';
// WP1.5.8: this was the last hand-rolled tab strip in the app — every other
// page's filter/status tabs already use the shared Tabs component.
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyLearningCourse } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

export default function MyLearningPage() {
    const router = useRouter();

    const [courses, setCourses] = useState<MyLearningCourse[]>([]);
    const [filter, setFilter] = useState<'not_started' | 'in_progress' | 'completed' | undefined>(undefined);
    const [appState, setAppState] = useState<'idle' | 'loading' | 'no_results' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const loadCourses = useCallback(async () => {
        setAppState('loading');
        setErrorMessage(null);

        try {
            const response = await getMyLearningCourses(filter);
            setCourses(response.courses);

            if (response.courses.length === 0) {
                setAppState('no_results');
            } else {
                setAppState('idle');
            }
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi tải danh sách Space.');
        }
    }, [filter]);

    const loadUser = useCallback(() => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    }, []);

    useEffect(() => {
        loadCourses();
        loadUser();
    }, [loadCourses, loadUser]);

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

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter === 'all' ? undefined : (newFilter as 'not_started' | 'in_progress' | 'completed'));
    };

    const handleCourseClick = (courseId: string) => {
        // Navigate to learning page - SCR-LRN-01
        router.push(`/courses/${courseId}/learn`);
    };

    const handleRetry = () => {
        loadCourses();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    // WP1.6.4 — for the "đã xem 3:20" readout on courses that are in_progress
    // but still 0% (no lesson duration is persisted anywhere, so this only
    // works with the raw saved position, not a percentage).
    const formatWatchedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const STATUS_LABEL: Record<MyLearningCourse['status'], string> = {
        not_started: 'Chưa bắt đầu',
        in_progress: 'Đang học',
        completed: 'Hoàn thành',
    };
    const STATUS_BADGE_CLASS: Record<MyLearningCourse['status'], string> = {
        not_started: 'bg-slate-100 text-slate-500',
        in_progress: 'bg-blue-50 text-blue-600',
        completed: 'bg-emerald-50 text-emerald-600',
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* Body */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        Space của tôi
                    </h1>
                    <p className="text-sm text-slate-500">
                        Tiếp tục hành trình học tập của bạn
                    </p>
                </div>

                {/* Section 01: Bộ lọc */}
                <div className="mb-6">
                    <Tabs value={filter ?? 'all'} onValueChange={handleFilterChange}>
                        <TabsList>
                            <TabsTrigger value="in_progress">Đang học</TabsTrigger>
                            <TabsTrigger value="not_started">Chưa bắt đầu</TabsTrigger>
                            <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                            <TabsTrigger value="all">Tất cả</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Section 02: Danh sách khóa học */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appState === 'loading' && (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                <Skeleton className="w-full aspect-video rounded-none bg-slate-200" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="h-4 w-3/4 bg-slate-200" />
                                    <Skeleton className="h-3 w-1/2 bg-slate-200" />
                                    <Skeleton className="h-2 w-full rounded-full mt-3 bg-slate-200" />
                                </div>
                            </div>
                        ))
                    )}

                    {appState === 'idle' && courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => handleCourseClick(course.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCourseClick(course.id); }}
                            className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {/* Thumbnail */}
                            <div className="w-full aspect-video bg-slate-100 rounded-t-xl flex items-center justify-center overflow-hidden relative">
                                {course.thumbnailUrl ? (
                                    <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 400px"
                                        className="object-cover rounded-t-xl"
                                    />
                                ) : (
                                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                )}
                            </div>

                            <div className="p-5">
                                {/* Course Title */}
                                <h3 className="text-sm font-semibold text-slate-900 mb-1 leading-snug line-clamp-2">
                                    {course.title}
                                </h3>
                                {/* WP1.10.6 — badge "N bài" phân biệt hình thái, không thêm
                                    tab/lọc riêng theo nguồn. */}
                                <p className="text-xs text-slate-400 mb-3">{course.lessonCount} bài</p>

                                {/* Progress — WP1.6.4: a course with very few lessons (e.g. a
                                    single video) can only ever show completionRate 0 or 100, so
                                    a 0% bar while the user is 70% through that one video reads as
                                    untouched. When we have no finished lesson yet but do have a
                                    saved video position, show "đã xem 3:20" instead of a flat 0%
                                    bar — there's no persisted lesson duration to turn that into a
                                    real percentage. */}
                                <div className="mb-3">
                                    {course.status === 'not_started' ? (
                                        <p className="text-xs text-slate-400">Chưa xem</p>
                                    ) : course.completionRate > 0 ? (
                                        <>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                                <span>Tiến độ</span>
                                                <span className="font-medium text-blue-600">{course.completionRate}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${course.completionRate}%` }}
                                                ></div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-blue-600 font-medium">
                                            Đã xem {formatWatchedTime(course.lastWatchedPositionSec || 0)}
                                        </p>
                                    )}
                                </div>

                                {/* Status and creation date */}
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE_CLASS[course.status]}`}>
                                        {STATUS_LABEL[course.status]}
                                    </span>
                                    <span>
                                        {formatDate(course.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {appState === 'no_results' && (
                        <div className="col-span-full flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-1">
                                Chưa có Space
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Bạn chưa có Space nào trong mục này.
                            </p>
                            <Button onClick={() => router.push('/')}>
                                Khám phá Space
                            </Button>
                        </div>
                    )}

                    {appState === 'error' && (
                        <div className="col-span-full flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-1">
                                Có lỗi xảy ra
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                {errorMessage}
                            </p>
                            <Button onClick={handleRetry}>
                                Thử lại
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
