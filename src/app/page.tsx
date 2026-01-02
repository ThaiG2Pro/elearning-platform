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
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero / Search Section */}
                <section className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">Khám phá khóa học</h2>
                            <p className="text-gray-600 mt-1">Học bất cứ lúc nào — bắt đầu với khóa học phù hợp.</p>
                        </div>
                        <div className="w-full md:max-w-md flex items-center gap-3">
                            <div className="flex-1">
                                <SearchBar value={searchQuery} onChange={handleSearchChange} />
                            </div>

                            {user?.role === 'LECTURER' && (
                                <button
                                    onClick={() => router.push('/lecturer/courses')}
                                    className="hidden md:inline-flex px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    Tạo khóa học
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Course List Section */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Khóa học nổi bật</h3>
                        <button
                            onClick={() => router.push('/')}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Xem tất cả
                        </button>
                    </div>

                    <CourseList
                        courses={courses}
                        loading={appState === 'loading'}
                        onCourseClick={handleCourseClick}
                    />

                    {/* Live region for screen readers */}
                    <div className="sr-only" aria-live="polite">
                        {appState === 'loading' ? 'Đang tải khóa học...' : ''}
                    </div>

                    {appState === 'error' && errorMessage && (
                        <div className="text-center py-4">
                            <p className="text-red-600">{errorMessage}</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
