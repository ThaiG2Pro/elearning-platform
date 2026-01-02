'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getEnrolledCourses } from '@/lib/course';
import { EnrolledCourse } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

export default function MyLearningPage() {
    const router = useRouter();

    const [courses, setCourses] = useState<EnrolledCourse[]>([]);
    const [filter, setFilter] = useState<'in_progress' | 'completed' | undefined>(undefined);
    const [appState, setAppState] = useState<'idle' | 'loading' | 'no_results' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        loadCourses();
        loadUser();
    }, [filter]);

    const loadUser = () => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    };

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

    const loadCourses = async () => {
        setAppState('loading');
        setErrorMessage(null);

        try {
            const response = await getEnrolledCourses(filter);
            setCourses(response.courses);

            if (response.courses.length === 0) {
                setAppState('no_results');
            } else {
                setAppState('idle');
            }
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi tải danh sách khóa học.');
        }
    };

    const handleFilterChange = (newFilter: 'in_progress' | 'completed') => {
        setFilter(newFilter);
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* Body */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Khóa học của tôi
                    </h2>
                    <p className="text-gray-600">
                        Tiếp tục hành trình học tập của bạn
                    </p>
                </div>

                {/* Section 01: Bộ lọc */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => handleFilterChange('in_progress')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${filter === 'in_progress'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Đang học
                            </button>
                            <button
                                onClick={() => handleFilterChange('completed')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${filter === 'completed'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Hoàn thành
                            </button>
                            <button
                                onClick={() => setFilter(undefined)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${filter === undefined
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Tất cả
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Section 02: Danh sách khóa học */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appState === 'loading' && (
                        // Skeleton loading
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                                <div className="w-full aspect-video bg-gray-200"></div>
                                <div className="p-4">
                                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
                            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {/* Thumbnail */}
                            <div className="w-full aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center overflow-hidden">
                                {course.thumbnailUrl ? (
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="h-full w-full object-cover rounded-t-lg"
                                    />
                                ) : (
                                    <div className="text-gray-400 text-sm">No Image</div>
                                )}
                            </div>

                            <div className="p-6">
                                {/* Course Title */}
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                                    {course.title}
                                </h3>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Tiến độ</span>
                                        <span aria-hidden>{course.completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden>
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                                            style={{ width: `${course.completionRate}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Status and Enrollment Date */}
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>
                                        {course.status === 'in_progress' ? 'Đang học' : 'Hoàn thành'}
                                    </span>
                                    <span>
                                        Tham gia: {formatDate(course.enrolledAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {appState === 'no_results' && (
                        <div className="col-span-full text-center py-12">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Chưa có khóa học
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Bạn chưa tham gia khóa học nào trong mục này.
                            </p>
                            <div>
                                <button
                                    onClick={() => router.push('/')}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Khám phá khóa học
                                </button>
                            </div>
                        </div>
                    )}

                    {appState === 'error' && (
                        <div className="col-span-full text-center py-12">
                            <div className="text-red-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Có lỗi xảy ra
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {errorMessage}
                            </p>
                            <button
                                onClick={handleRetry}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
