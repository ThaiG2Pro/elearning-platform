'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicCourse } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getSharedCourse, copySharedCourse } from '@/lib/courses';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'error' | 'success';

/**
 * WP1.4 — anonymous landing page for a shared course link. Works without
 * login (view-only); "Sao chép về học" clones the course into the visitor's
 * own account, prompting login first if needed.
 */
export default function SharedCoursePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = params.token as string;

    const [course, setCourse] = useState<PublicCourse | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        setUser(AuthUtils.getCurrentUser());
    }, []);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                setAppState('loading');
                setErrorMessage(null);
                const data = await getSharedCourse(token);
                setCourse(data);
                setAppState('success');
            } catch (error: any) {
                setAppState('error');
                setErrorMessage(error.message);
            }
        };
        if (token) fetchCourse();
    }, [token]);

    // WP1.5.12 — `copying` state alone isn't enough to block a double-fire:
    // the auto-copy effect and a manual click can both read `copying` as
    // false in the same tick (state updates aren't synchronous), so both
    // paths could call copySharedCourse before either commits. A ref is
    // set synchronously and is the real guard; `copying` still drives the
    // disabled/label UI. Backend cloneForOwner is also now idempotent
    // (dedupes by owner+source), so this is belt-and-suspenders.
    const isCopyingRef = useRef(false);

    const handleCopy = useCallback(async () => {
        if (!user) {
            const continueUrl = `/share/${token}?copy=1`;
            router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
            return;
        }
        if (isCopyingRef.current) return;
        isCopyingRef.current = true;
        try {
            setCopying(true);
            setErrorMessage(null);
            const result = await copySharedCourse(token);
            router.push(`/courses/${result.courseId}/learn`);
        } catch (error: any) {
            setErrorMessage(error.message);
            setCopying(false);
            isCopyingRef.current = false;
        }
    }, [user, token, router]);

    // Auto-copy once the visitor returns from login with ?copy=1
    useEffect(() => {
        if (user && searchParams.get('copy') === '1' && appState === 'success' && !isCopyingRef.current) {
            handleCopy();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, appState]);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {appState === 'loading' ? (
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-2/3 bg-slate-200" />
                        <Skeleton className="h-4 w-1/3 bg-slate-200" />
                        <Skeleton className="h-32 rounded-xl bg-slate-200" />
                    </div>
                ) : appState === 'error' ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{errorMessage}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Về trang chủ
                        </button>
                    </div>
                ) : course ? (
                    <>
                        <section className="mb-6">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mb-3">
                                Khóa học được chia sẻ
                            </span>
                            <h1 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{course.title}</h1>
                            {course.ownerName && (
                                <p className="text-sm text-slate-500 mb-2">
                                    Chia sẻ bởi <span className="font-medium text-slate-800">{course.ownerName}</span>
                                </p>
                            )}
                            {course.description && (
                                <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
                            )}
                        </section>

                        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Nội dung khóa học
                            </h2>
                            <div className="space-y-3">
                                {course.chapters.map((chapter) => (
                                    <div key={chapter.id}>
                                        <p className="text-sm font-semibold text-slate-700 mb-1">{chapter.title}</p>
                                        <ul className="pl-4 space-y-0.5">
                                            {chapter.lessons.map((lesson) => (
                                                <li key={lesson.id} className="text-sm text-slate-600">
                                                    {lesson.title}
                                                    <span className="ml-1 text-slate-400 text-xs">({lesson.type})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {errorMessage && (
                            <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
                        )}

                        <section>
                            <button
                                onClick={handleCopy}
                                disabled={copying}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                                {copying ? 'Đang sao chép…' : 'Sao chép về học'}
                            </button>
                        </section>
                    </>
                ) : null}
            </main>
        </div>
    );
}
