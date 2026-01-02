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
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {state === 'loading' && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Đang tải danh sách...</p>
                    </div>
                )}

                {state === 'error' && (
                    <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={fetchApprovalQueue}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {state === 'empty' && (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Không có khóa học nào chờ duyệt.</p>
                    </div>
                )}

                {state === 'idle' && (
                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Danh sách khóa học chờ duyệt</h2>
                            <p className="text-sm text-gray-500 mt-1">Xem qua và xử lý các yêu cầu phê duyệt từ giảng viên.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên khóa học
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Giảng viên
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ngày gửi
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {queue.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{item.lecturerName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{formatDate(item.submittedAt)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewCourse(item.id)}
                                                    className="inline-flex items-center px-3 py-1 rounded text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    disabled={processingId === item.id}
                                                >
                                                    Xem
                                                </button>
                                                <button
                                                    onClick={() => handleModerate(item.id, 'APPROVE')}
                                                    className="inline-flex items-center px-3 py-1 rounded text-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                    disabled={processingId === item.id}
                                                >
                                                    {processingId === item.id ? 'Đang xử lý...' : 'Duyệt'}
                                                </button>
                                                <button
                                                    onClick={() => handleModerate(item.id, 'REJECT')}
                                                    className="inline-flex items-center px-3 py-1 rounded text-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    disabled={processingId === item.id}
                                                >
                                                    Từ chối
                                                </button>
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
