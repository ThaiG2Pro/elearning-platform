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
                {/* Search Section */}
                <section className="mb-8">
                    <SearchBar value={searchQuery} onChange={handleSearchChange} />
                </section>

                {/* Course List Section */}
                <section>
                    <CourseList
                        courses={courses}
                        loading={appState === 'loading'}
                        onCourseClick={handleCourseClick}
                    />
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
