'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { CourseDetail } from '@/types/course.types';
import { User } from '@/types/auth.types';
import { getCourseDetail, enrollCourse } from '@/lib/courses';
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

        if (courseId) {
            fetchCourse();
        }
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

    const handleEnroll = async () => {
        if (!course) return;

        try {
            setAppState('processing');
            await enrollCourse(courseId);
            // Update course state to enrolled
            setCourse({ ...course, isEnrolled: true });
            setAppState('success');
            // Navigate to learning screen after successful enrollment
            router.push(`/courses/${courseId}/learn`);
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message);
        }
    };

    const handleLearn = () => {
        router.push(`/courses/${courseId}/learn`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Section */}
                <section className="mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại danh sách
                    </button>
                </section>

                {appState === 'loading' ? (
                    <div className="animate-pulse">
                        <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
                        <div className="h-8 bg-gray-300 rounded mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded mb-6"></div>
                        <div className="h-10 bg-gray-300 rounded w-32"></div>
                    </div>
                ) : course ? (
                    <>
                        {/* Visual Content Section */}
                        <section className="mb-6">
                            <div className="h-64 bg-gray-200 rounded-lg overflow-hidden">
                                {course.thumbnailUrl ? (
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Information Section */}
                        <section className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
                            {course.lecturerName && (
                                <p className="text-lg text-gray-600 mb-4">Giảng viên: {course.lecturerName}</p>
                            )}
                            {course.description && (
                                <p className="text-gray-700 leading-relaxed">{course.description}</p>
                            )}
                        </section>

                        {/* Interaction Section */}
                        <section>
                            {user?.role === 'STUDENT' ? (
                                course.isEnrolled ? (
                                    <button
                                        onClick={handleLearn}
                                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
                                    >
                                        Bắt đầu học
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleEnroll}
                                        disabled={appState === 'processing'}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                                    >
                                        {appState === 'processing' ? 'Đang đăng ký...' : 'Đăng ký học'}
                                    </button>
                                )
                            ) : user ? (
                                <p className="text-gray-500">Chỉ học viên mới có thể đăng ký khóa học.</p>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                                >
                                    Tham gia để đăng ký
                                </button>
                            )}
                        </section>
                    </>
                ) : appState === 'error' && errorMessage ? (
                    <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{errorMessage}</p>
                        <button
                            onClick={handleBack}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Quay lại
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
