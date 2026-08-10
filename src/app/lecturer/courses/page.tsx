'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getLecturerCourses, createCourseFromLink } from '@/lib/lecturer';
import Toast from '@/components/Toast';
import { Skeleton } from '@/components/ui/skeleton';
// WP1.5.8: standardize on the shared component set — this page used to have
// a hand-rolled modal despite ui/dialog.tsx already being installed, plus
// raw bg-indigo-600 buttons and a hand-rolled tab strip despite ui/tabs.tsx
// existing too.
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LecturerCourse } from '@/types/lecturer.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type Status = 'All' | 'Active' | 'Archived';

const LecturerCoursesPage = () => {
    const [courses, setCourses] = useState<LecturerCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<Status>('All');
    const [user, setUser] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const router = useRouter();

    const fetchCourses = useCallback(async (status?: Status) => {
        setLoading(true);
        setError(null);
        try {
            // If status is 'All' we pass undefined so the API returns all courses
            const apiStatus = status === 'All' ? undefined : status;
            const params = apiStatus ? { status: apiStatus } : undefined;
            const response = await getLecturerCourses(params);
            // Guard against unexpected API shapes — API may return either an array or { courses: [] }
            const normalized = Array.isArray(response) ? response : response?.courses || [];
            setCourses(normalized);
        } catch (err: any) {
            // On error ensure we reset to an empty list to avoid undefined runtime errors
            setCourses([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadUser = useCallback(() => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    }, []);

    useEffect(() => {
        fetchCourses(selectedStatus);
        loadUser();
    }, [selectedStatus, fetchCourses, loadUser]);

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

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status as Status);
    };

    const handleCreateFromLink = async () => {
        if (!linkUrl.trim()) return;
        setCreateError(null);
        setCreating(true);
        try {
            const res = await createCourseFromLink(linkUrl.trim());
            setShowLinkModal(false);
            setLinkUrl('');
            router.push(`/lecturer/courses/${res.courseId}/edit`);
        } catch (err: any) {
            setCreateError(err.message || 'Lỗi khi tạo khóa học');
        } finally {
            setCreating(false);
        }
    };

    const handleCourseClick = (course: LecturerCourse) => {
        // Personal-organizer model: the owner can always edit their course,
        // there is no separate draft-vs-published destination anymore.
        router.push(`/lecturer/courses/${course.id}/edit`);
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

    const closeLinkModal = () => {
        setShowLinkModal(false);
        setLinkUrl('');
        setCreateError(null);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Khóa học của tôi</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Quản lý và xuất bản khóa học</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => { setCreateError(null); setShowLinkModal(true); }}
                            disabled={creating}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                            Tạo khóa học từ link
                        </Button>
                    </div>
                </div>

                {/* Section 01: Bộ lọc trạng thái */}
                <div className="mb-6">
                    <Tabs value={selectedStatus} onValueChange={handleStatusChange}>
                        <TabsList>
                            <TabsTrigger value="All">Tất cả</TabsTrigger>
                            <TabsTrigger value="Active">Hoạt động</TabsTrigger>
                            <TabsTrigger value="Archived">Lưu trữ</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {createError && (
                    <Toast message={createError} type="error" onClose={() => setCreateError(null)} />
                )}

                {/* Section 02: Danh sách khóa học */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <Skeleton className="h-32 w-full rounded-none bg-slate-200" />
                                <div className="p-5 space-y-2">
                                    <Skeleton className="h-4 w-3/4 bg-slate-200" />
                                    <Skeleton className="h-3 w-1/3 bg-slate-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{getErrorMessage(error)}</p>
                        <Button onClick={() => fetchCourses(selectedStatus)}>
                            Thử lại
                        </Button>
                    </div>
                ) : (!courses || courses.length === 0) ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">Không có khóa học</h3>
                        <p className="text-sm text-slate-500 mb-5">Bạn chưa có khóa học nào trong mục này.</p>
                        {user?.role === 'LECTURER' && (
                            <Button onClick={() => { setCreateError(null); setShowLinkModal(true); }}>
                                Tạo khóa học đầu tiên
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => handleCourseClick(course)}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                    {course.thumbnailUrl ? (
                                        <Image
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 300px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                    )}
                                </div>

                                <div className="p-5">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">{course.title}</h3>

                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${((course.status || '') as string).toUpperCase() === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        {((course.status || '') as string).toUpperCase() === 'ACTIVE' ? 'Hoạt động' : 'Lưu trữ'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* WP1.1 — dán link đầu tiên → tự tạo course có cấu trúc chương/bài */}
            <Dialog open={showLinkModal} onOpenChange={(open) => { if (!open) closeLinkModal(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo khóa học từ link</DialogTitle>
                        <DialogDescription>
                            Dán link video YouTube — hệ thống sẽ tự lấy tiêu đề, ảnh và tạo khóa học có sẵn bài học đầu tiên.
                        </DialogDescription>
                    </DialogHeader>
                    <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFromLink(); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        autoFocus
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={closeLinkModal} disabled={creating}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreateFromLink} disabled={creating || !linkUrl.trim()}>
                            {creating ? 'Đang tạo…' : 'Tạo khóa học'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LecturerCoursesPage;
