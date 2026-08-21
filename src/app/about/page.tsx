'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

export default function AboutPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
        } catch {
            setUser(null);
        }
    };

    const handleJoin = () => {
        router.push('/join');
    };

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
                {/* Hero Section */}
                <section className="bg-ink-panel border border-ink-border rounded-ink-lg p-8 sm:p-12 shadow-ink-sm text-center max-w-4xl mx-auto mb-12 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-60 h-60 bg-ink-accentA rounded-full blur-3xl opacity-50 pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-ink-accentA rounded-full blur-3xl opacity-50 pointer-events-none" />

                    <span className="inline-flex items-center gap-1.5 px-3 me-1 py-1 rounded-full text-xs font-semibold bg-ink-accentA text-ink-accent border border-ink-border mb-4">
                        ✨ Về E-Learning Cá Nhân
                    </span>

                    <h1 className="text-3xl sm:text-5xl font-extrabold text-ink-text tracking-tight leading-tight">
                        Học tập chủ động - Xây dựng tri thức theo cách của bạn
                    </h1>

                    <p className="mt-4 text-base sm:text-lg text-ink-textMid max-w-2xl mx-auto leading-relaxed">
                        Nền tảng giúp bạn biến mọi nội dung video, tài liệu trực tuyến thành các <strong className="text-ink-text">Không gian học tập (Space)</strong> cá nhân hóa, có lộ trình bài bản, tiến độ rõ ràng và tự đánh giá hiệu quả.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-6 py-2.5 h-auto text-sm sm:text-base rounded-ink-md shadow-ink-sm transition-all"
                        >
                            Khám phá Space
                        </Button>
                        {user ? (
                            <Button
                                onClick={() => router.push('/my-courses')}
                                variant="outline"
                                className="border-ink-border text-ink-text hover:bg-ink-page font-medium px-6 py-2.5 h-auto text-sm sm:text-base rounded-ink-md transition-all"
                            >
                                Space của tôi
                            </Button>
                        ) : (
                            <Button
                                onClick={handleJoin}
                                variant="outline"
                                className="border-ink-border text-ink-text hover:bg-ink-page font-medium px-6 py-2.5 h-auto text-sm sm:text-base rounded-ink-md transition-all"
                            >
                                Tham gia ngay
                            </Button>
                        )}
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="grid md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-ink-panel border border-ink-border rounded-ink-lg p-6 sm:p-8 shadow-ink-sm flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-ink-md bg-ink-accentA border border-ink-border flex items-center justify-center text-ink-accent mb-5">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-ink-text mb-2">Sứ mệnh của chúng tôi</h2>
                            <p className="text-ink-textMid leading-relaxed text-sm sm:text-base">
                                Mang đến trải nghiệm học tập tự do và chất lượng cao nhất cho từng cá nhân. Chúng tôi tin rằng tri thức trên Internet là vô tận, nhưng điều quan trọng nhất là cách bạn chọn lọc, tổ chức và hấp thụ nội dung thành kỹ năng thực tế.
                            </p>
                        </div>
                    </div>

                    <div className="bg-ink-panel border border-ink-border rounded-ink-lg p-6 sm:p-8 shadow-ink-sm flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-ink-md bg-ink-accentA border border-ink-border flex items-center justify-center text-ink-accent mb-5">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-ink-text mb-2">Tầm nhìn phát triển</h2>
                            <p className="text-ink-textMid leading-relaxed text-sm sm:text-base">
                                Trở thành người đồng hành đáng tin cậy cho mọi người học tự do (Self-learner). Tạo dựng một môi trường học không rào cản, nơi bạn là <strong className="text-ink-text">Chủ sở hữu (Owner)</strong> hoàn toàn lộ trình học và tiến trình phát triển bản thân.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Key Features */}
                <section className="mb-12">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-ink-text">Tính năng nổi bật</h2>
                        <p className="text-ink-textMuted text-sm sm:text-base mt-2">
                            Những công cụ mạnh mẽ được thiết kế tối giản để phục vụ hiệu quả cho quá trình tiếp thu kiến thức.
                        </p>
                    </div>

                    {/* 4 icon màu khác nhau (xanh/lục/hổ phách/tím) CỐ Ý giữ nguyên —
                        đây là dải minh hoạ trang trí cho 4 tính năng riêng biệt trên
                        trang giới thiệu, không phải badge/CTA lặp lại nên không phạm
                        nguyên tắc "một accent duy nhất" (nguyên tắc đó nhằm vào chip/
                        nút hành động, không nhằm vào icon trang trí minh hoạ nội dung). */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm hover:border-ink-borderHi transition-all">
                            <div className="w-10 h-10 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold mb-4">
                                🔗
                            </div>
                            <h3 className="font-semibold text-ink-text text-base mb-1">Tạo Space từ Link</h3>
                            <p className="text-ink-textMid text-sm leading-relaxed">
                                Dán liên kết video YouTube hoặc tài liệu nguồn để khởi tạo bài học nhanh chóng chỉ với một thao tác.
                            </p>
                        </div>

                        <div className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm hover:border-ink-borderHi transition-all">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold mb-4">
                                📚
                            </div>
                            <h3 className="font-semibold text-ink-text text-base mb-1">Chương & Bài học</h3>
                            <p className="text-ink-textMid text-sm leading-relaxed">
                                Sắp xếp nội dung khoa học theo các chương tùy chỉnh hoặc khóa học phẳng linh hoạt.
                            </p>
                        </div>

                        <div className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm hover:border-ink-borderHi transition-all">
                            <div className="w-10 h-10 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold mb-4">
                                ⚡
                            </div>
                            <h3 className="font-semibold text-ink-text text-base mb-1">Quiz & Ôn tập</h3>
                            <p className="text-ink-textMid text-sm leading-relaxed">
                                Tích hợp câu hỏi kiểm tra và tóm tắt kiến thức nhằm củng cố khả năng ghi nhớ dài hạn.
                            </p>
                        </div>

                        <div className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm hover:border-ink-borderHi transition-all">
                            <div className="w-10 h-10 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center font-bold mb-4">
                                📈
                            </div>
                            <h3 className="font-semibold text-ink-text text-base mb-1">Đo lường tiến độ</h3>
                            <p className="text-ink-textMid text-sm leading-relaxed">
                                Theo dõi chi tiết tỉ lệ hoàn thành bài học, lưu trữ vị trí đang xem để tiếp tục bất cứ lúc nào.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Product Philosophy — nền tối bespoke, CỐ Ý giữ nguyên (không đổi
                    sang ink.*): hệ ink chỉ định nghĩa token cho nền sáng ("giấy
                    trắng"), không có cặp token nào an toàn để dùng trên nền đảo màu
                    như khối trang trí này — ép ink-text (màu tối) lên nền tối sẽ vỡ
                    contrast. Đây không phải "chế độ tối toàn app" (đã chốt KHÔNG làm
                    ở mục 6), chỉ là 1 khối trang trí cục bộ trên trang giới thiệu. */}
                <section className="bg-slate-900 text-white rounded-ink-lg p-8 sm:p-12 mb-12 shadow-md">
                    <div className="max-w-3xl">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Triết lý thiết kế</span>
                        <h2 className="text-2xl sm:text-4xl font-bold mt-2 mb-4 text-white">Tối giản để tập trung nghiền ngẫm</h2>
                        <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
                            Chúng tôi tin rằng sự xao nhãng là kẻ thù lớn nhất của việc học. Giao diện được tinh giản tối đa, không có quảng cáo chen ngang hay thông báo gây phiền toái, giúp bạn toàn tâm vào nội dung tri thức.
                        </p>

                        <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">100%</div>
                                <div className="text-slate-400 text-xs sm:text-sm mt-1">Chủ động tiến độ</div>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">0%</div>
                                <div className="text-slate-400 text-xs sm:text-sm mt-1">Quảng cáo & xao nhãng</div>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">24/7</div>
                                <div className="text-slate-400 text-xs sm:text-sm mt-1">Sẵn sàng truy cập</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Banner */}
                <section className="bg-ink-accent text-white rounded-ink-lg p-8 text-center shadow-ink-sm">
                    <h2 className="text-2xl sm:text-3xl font-bold">Bắt đầu hành trình học tập của bạn ngay hôm nay</h2>
                    <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xl mx-auto">
                        Tạo Space học tập riêng hoặc tìm kiếm các chủ đề thú vị từ thư viện không gian học tập.
                    </p>
                    <div className="mt-6">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-white hover:bg-ink-page text-ink-accent font-semibold px-6 py-2.5 h-auto text-sm sm:text-base rounded-ink-md transition-all shadow"
                        >
                            Khám phá ngay
                        </Button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-12 text-center text-xs sm:text-sm text-ink-textMuted">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>© {new Date().getFullYear()} E-Learning Platform. Học tập chủ động & cá nhân hóa.</p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="hover:text-ink-text transition-colors">
                            Trang chủ
                        </button>
                        <button onClick={() => router.push('/about')} className="hover:text-ink-text transition-colors font-medium text-ink-text">
                            Về chúng tôi
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
