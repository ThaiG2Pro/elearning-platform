'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getLecturerCourses, createCourse } from '@/lib/lecturer';
import { LecturerCourse } from '@/types/lecturer.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type Status = 'All' | 'Draft' | 'Pending' | 'Active';

const LecturerCoursesPage = () => {
    const [courses, setCourses] = useState<LecturerCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<Status>('All');
    const [user, setUser] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const router = useRouter();

    const fetchCourses = async (status?: Status) => {
        setLoading(true);
        setError(null);
        try {
            // Draft tab should show courses with status = DRAFT (including those with reject notes)
            if (status === 'Draft') {
                const response = await getLecturerCourses(undefined);
                const normalized = Array.isArray(response) ? response : response?.courses || [];
                const filtered = normalized.filter(c => {
                    const s = ((c.status || '') as string).toUpperCase();
                    return s === 'DRAFT';
                });
                setCourses(filtered);
            } else {
                // If status is 'All' we pass undefined so the API returns all courses
                const apiStatus = status === 'All' ? undefined : status;
                // Map frontend statuses to backend values if necessary (e.g., ACTIVE/PENDING)
                const params = apiStatus ? { status: apiStatus } : undefined;
                const response = await getLecturerCourses(params);
                // Guard against unexpected API shapes — API may return either an array or { courses: [] }
                const normalized = Array.isArray(response) ? response : response?.courses || [];
                setCourses(normalized);
            }
        } catch (err: any) {
            // On error ensure we reset to an empty list to avoid undefined runtime errors
            setCourses([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses(selectedStatus);
        loadUser();
    }, [selectedStatus]);

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

    const handleStatusChange = (status: Status) => {
        setSelectedStatus(status);
    };



    const handleCourseClick = (course: LecturerCourse) => {
        const statusNormalized = ((course.status || '') as string).toUpperCase();
        // If course is still a draft (backend might return 'DRAFT'), go to edit, else view
        if (statusNormalized === 'DRAFT') {
            router.push(`/lecturer/courses/${course.id}/edit`);
        } else {
            router.push(`/lecturer/courses/${course.id}/view`);
        }
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'ACCESS_DENIED':
                return 'Bạn không có quyền giảng viên để xem danh sách này';
            case 'UNAUTHORIZED':
                return 'Phiên đăng nhập đã hết hạn';
            case 'COURSE_NOT_FOUND':
                return 'Không tìm thấy thông tin khóa học';
            default:
                return 'Hệ thống không thể tải danh sách khóa học lúc này';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleJoin}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Tham gia
                        </button>
                        <button
                            onClick={async () => {
                                // noop placeholder if needed
                            }}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 hidden"
                        >
                            Import
                        </button>
                        <button
                            onClick={async () => {
                                setCreateError(null);
                                setCreating(true);
                                try {
                                    const res = await createCourse({ title: 'Khóa học mới' });
                                    const newId = (res as any)?.id;
                                    const idStr = typeof newId === 'number' ? String(newId) : String(newId);
                                    // redirect to editor (use lecturer editor path)
                                    router.push(`/lecturer/courses/${idStr}/edit`);
                                } catch (err: any) {
                                    setCreateError(err.message || 'Lỗi khi tạo khóa học');
                                } finally {
                                    setCreating(false);
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                            disabled={creating}
                        >
                            {creating ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                'Tạo khóa học'
                            )}
                        </button>
                    </div>
                </div>

                {/* Section 01: Bộ lọc trạng thái (Tabs like My Learning) */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            {(['All', 'Draft', 'Pending', 'Active'] as Status[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedStatus === status
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {status === 'All' ? 'Tất cả' : status}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {createError && (
                    <div className="mb-4 px-4">
                        <div className="text-sm text-red-600">{createError}</div>
                    </div>
                )}

                {/* Section 02: Danh sách khóa học */}
                {loading ? (
                    // Use the same skeleton cards as My Learning
                    Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                            <div className="h-32 bg-gray-200 rounded mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-2 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{getErrorMessage(error)}</p>
                        <button
                            onClick={() => fetchCourses(selectedStatus)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : (!courses || courses.length === 0) ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có khóa học</h3>
                        <p className="text-gray-600">Bạn chưa có khóa học nào trong mục này.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => handleCourseClick(course)}
                                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <div className="h-32 bg-gray-200 rounded-t-lg flex items-center justify-center">
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
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>

                                    {/* Status & metadata (show backend status and reject note) */}
                                    <div className="mb-2 flex items-center justify-between">
                                        {/* Normalize status to uppercase to match backend values */}
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${((course.status || '') as string).toUpperCase() === 'ACTIVE'
                                                ? 'bg-green-100 text-green-800'
                                                : ((course.status || '') as string).toUpperCase() === 'PENDING'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : (((course.status || '') as string).toUpperCase() === 'DRAFT' && (course as any).rejectNote)
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {((course.status || '') as string).toUpperCase() === 'ACTIVE' ? 'Đang hoạt động' : ((course.status || '') as string).toUpperCase() === 'PENDING' ? 'Chờ duyệt' : (((course.status || '') as string).toUpperCase() === 'DRAFT' && (course as any).rejectNote) ? 'Bị từ chối' : 'Nháp'}
                                        </span>

                                    </div>

                                    {(((course.status || '') as string).toUpperCase() === 'DRAFT' && (course as any).rejectNote) && (
                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                            <p className="text-sm text-red-700">{(course as any).rejectNote}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LecturerCoursesPage;
