'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import CourseList from '@/components/CourseList';
import { Course } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getCourses } from '@/lib/courses';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'error' | 'success';

export default function Home() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Effect for search changes
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setAppState('loading');
                setErrorMessage(null);
                const data = await getCourses(debouncedSearchQuery || undefined);
                setCourses(data);
                setAppState('success');
            } catch (error: any) {
                setAppState('error');
                setErrorMessage(error.message);
                setCourses([]);
            }
        };

        fetchCourses(); // Always fetch courses, with or without search
    }, [debouncedSearchQuery]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

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
                        <div className="w-full md:max-w-sm flex items-center gap-3">
                            <div className="flex-1">
                                <SearchBar value={searchQuery} onChange={handleSearchChange} />
                            </div>
                            {user && (
                                <button
                                    onClick={() => router.push('/lecturer/courses')}
                                    className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                    Tạo khóa học
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Course List Section */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-800">
                            {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Khóa học nổi bật'}
                        </h2>
                        {appState === 'success' && (
                            <span className="text-xs text-slate-400">{/* course count could go here */}</span>
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
                            <button
                                onClick={() => setDebouncedSearchQuery(searchQuery)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
