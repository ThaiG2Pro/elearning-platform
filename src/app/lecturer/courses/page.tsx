'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getLecturerCourses } from '@/lib/lecturer';
import { LecturerCourse } from '@/types/lecturer.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type Status = 'Draft' | 'Pending' | 'Active';

const LecturerCoursesPage = () => {
    const [courses, setCourses] = useState<LecturerCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<Status>('Draft');
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const fetchCourses = async (status?: Status) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getLecturerCourses(status ? { status } : undefined);
            // Guard against unexpected API shapes — always keep courses as an array
            setCourses(response?.courses || []);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const handleCourseClick = (course: LecturerCourse) => {
        if (course.status === 'Draft') {
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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Courses</h1>

                {/* Section 01: Bộ lọc trạng thái (Tabs like My Learning) */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            {(['Draft', 'Pending', 'Active'] as Status[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedStatus === status
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

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

                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                                            <span>Tiến độ</span>
                                            <span>{((course as any).completionRate ?? 0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${(course as any).completionRate ?? 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>
                                            {course.status === 'Draft' ? 'Nháp' : course.status === 'Pending' ? 'Chờ duyệt' : 'Đang hoạt động'}
                                        </span>
                                        <span>
                                            Ngày tạo: {formatDate(course.createdAt)}
                                        </span>
                                    </div>
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
