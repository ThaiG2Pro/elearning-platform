'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ApprovalQueueItem } from '@/types/admin.types';
import { getApprovalQueue, moderateCourse } from '@/lib/admin';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AdminState = 'idle' | 'loading' | 'processing' | 'empty' | 'error';

const AdminApprovalQueuePage = () => {
    const router = useRouter();
    const [state, setState] = useState<AdminState>('idle');
    const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetchApprovalQueue();
        loadUser();
    }, []);

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

    const fetchApprovalQueue = async () => {
        setState('loading');
        setError(null);
        try {
            const data = await getApprovalQueue();
            if (data.length === 0) {
                setState('empty');
            } else {
                setQueue(data);
                setState('idle');
            }
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    };

    const handleViewCourse = (courseId: number) => {
        router.push(`/lecturer/courses/${courseId}/view`);
    };

    const handleModerate = async (courseId: number, action: 'APPROVE' | 'REJECT') => {
        let rejectNote: string | undefined;
        if (action === 'REJECT') {
            rejectNote = prompt('Nhập lý do từ chối:') || undefined;
            if (!rejectNote) return;
        }
        setProcessingId(courseId);
        try {
            await moderateCourse(courseId, { action, rejectNote });
            alert(action === 'APPROVE' ? 'Khóa học đã được duyệt thành công' : 'Khóa học đã bị từ chối');
            fetchApprovalQueue(); // Reload list
        } catch (err: any) {
            alert(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Hàng chờ duyệt</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Xem qua và xử lý các yêu cầu phê duyệt từ giảng viên.</p>
                </div>

                {state === 'loading' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <div className="h-4 bg-slate-200 rounded w-48 animate-pulse"/>
                        </div>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 animate-pulse">
                                <div className="h-3 bg-slate-200 rounded w-1/3"/>
                                <div className="h-3 bg-slate-200 rounded w-1/5"/>
                                <div className="h-3 bg-slate-200 rounded w-1/6"/>
                                <div className="flex gap-2 ml-auto">
                                    <div className="h-7 bg-slate-200 rounded w-14"/>
                                    <div className="h-7 bg-slate-200 rounded w-14"/>
                                    <div className="h-7 bg-slate-200 rounded w-14"/>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {state === 'error' && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{error}</p>
                        <button
                            onClick={fetchApprovalQueue}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {state === 'empty' && (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">Không có yêu cầu nào</h3>
                        <p className="text-sm text-slate-400">Không có khóa học nào đang chờ duyệt.</p>
                    </div>
                )}

                {state === 'idle' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-800">Khóa học chờ duyệt</h2>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                    {queue.length} yêu cầu
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-slate-700">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                                            Tên khóa học
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                                            Giảng viên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                                            Ngày gửi
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-200 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {queue.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-500">{item.lecturerName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-500">{formatDate(item.submittedAt)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewCourse(item.id)}
                                                        className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                        disabled={processingId === item.id}
                                                    >
                                                        Xem
                                                    </button>
                                                    <button
                                                        onClick={() => handleModerate(item.id, 'APPROVE')}
                                                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                        disabled={processingId === item.id}
                                                    >
                                                        {processingId === item.id ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                                Xử lý...
                                                            </span>
                                                        ) : 'Duyệt'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleModerate(item.id, 'REJECT')}
                                                        className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                        disabled={processingId === item.id}
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminApprovalQueuePage;
