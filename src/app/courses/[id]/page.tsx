'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseDetail } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getCourseDetail } from '@/lib/courses';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'processing' | 'error' | 'success';

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = parseInt(params.id as string);

    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [user, setUser] = useState<User | null>(null); // TODO: Get from auth context
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch course detail on mount
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setAppState('loading');
                setErrorMessage(null);
                const data = await getCourseDetail(courseId);
                setCourse(data);
                setAppState('success');
            } catch (error: any) {
                setAppState('error');
                setErrorMessage(error.message);
            }
        };

        // WP1.5.12: `courseId` was never checked for NaN — a malformed
        // course-id in the URL (e.g. /courses/abc) left appState stuck at
        // 'idle' forever, rendering nothing (no loading, no error). Surface
        // it as an error immediately instead of silently doing nothing.
        if (Number.isNaN(courseId)) {
            setAppState('error');
            setErrorMessage('Đường dẫn khóa học không hợp lệ.');
            return;
        }

        fetchCourse();
    }, [courseId]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
        } catch (error: any) {
            setUser(null);
        }
    };

    const handleJoin = () => {
        const currentUrl = window.location.pathname;
        router.push(`/join?continueUrl=${encodeURIComponent(currentUrl)}`);
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleLearn = () => {
        router.push(`/courses/${courseId}/learn`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Section */}
                <section className="mb-6">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại danh sách
                    </button>
                </section>

                {appState === 'loading' ? (
                    <div className="space-y-4">
                        <Skeleton className="h-64 rounded-xl bg-slate-200" />
                        <Skeleton className="h-6 w-2/3 bg-slate-200" />
                        <Skeleton className="h-4 w-1/3 bg-slate-200" />
                        <Skeleton className="h-4 w-full bg-slate-200" />
                        <Skeleton className="h-4 w-5/6 bg-slate-200" />
                        <Skeleton className="h-10 w-32 mt-2 bg-slate-200" />
                    </div>
                ) : course ? (
                    <>
                        {/* Visual Content Section */}
                        <section className="mb-6">
                            <div className="w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                                {course.thumbnailUrl ? (
                                    <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 800px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        <span className="text-sm">Chưa có ảnh</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Information Section */}
                        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
                            <h1 className="text-xl font-bold text-slate-900 mb-3 leading-snug">{course.title}</h1>
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                {course.lecturerName && (
                                    <p className="text-sm text-slate-500">
                                        Giảng viên: <span className="font-medium text-slate-800">{course.lecturerName}</span>
                                    </p>
                                )}
                            </div>
                            {course.description && (
                                <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
                            )}
                            {course.isEnrolled && typeof course.completionRate === 'number' && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                        <span>Tiến độ học của bạn</span>
                                        <span className="font-medium text-slate-700">{course.completionRate}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${course.completionRate}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Interaction Section */}
                        {/* WP1.6.1 — the catalog (GET /courses) lists every user's ACTIVE
                            courses, not just the viewer's own, but course access (learn/
                            lessons) is ownership-based. This button used to show "Bắt đầu
                            học" for ANY logged-in user regardless of ownership, sending
                            non-owners straight into a 403 NOT_ENROLLED dead-end on
                            /courses/[id]/learn. `course.isEnrolled` (owner match, already
                            computed by CourseService.getCourseDetail) is the real signal. */}
                        <section>
                            {!user ? (
                                <button
                                    onClick={handleJoin}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    Tham gia để học
                                </button>
                            ) : course.isEnrolled ? (
                                <button
                                    onClick={handleLearn}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Bắt đầu học
                                </button>
                            ) : (
                                <p className="text-sm text-slate-500 bg-slate-100 rounded-lg px-4 py-3">
                                    Đây là khóa học của người dùng khác — bạn không thể học trực tiếp khóa học này.
                                </p>
                            )}
                        </section>
                    </>
                ) : appState === 'error' && errorMessage ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{errorMessage}</p>
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Quay lại
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
