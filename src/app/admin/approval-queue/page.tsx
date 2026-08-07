'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { AuthUtils } from '@/lib/auth';

export default function ApprovalQueueDeprecationPage() {
    const router = useRouter();
    const user = AuthUtils.getCurrentUser();

    return (
        <div className="min-h-screen bg-slate-50">
            <Header user={user} />

            <main className="max-w-3xl mx-auto px-4 py-16 text-center">
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Hàng chờ duyệt đã được bãi bỏ</h1>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Theo tầm nhìn mới của sản phẩm (Personal Link-Organizer), mọi khóa học/liên kết đều thuộc sở hữu cá nhân và có hiệu lực ngay lập tức mà không cần qua quy trình duyệt bài.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
                    >
                        Quay lại Trang chủ
                    </button>
                </div>
            </main>
        </div>
    );
}
