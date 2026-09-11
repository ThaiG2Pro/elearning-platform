'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// Đây LÀ một chuỗi thao tác thật theo đúng thứ tự người dùng thường đi qua
// (tạo Space → soạn bài → học → theo dõi tiến độ → chia sẻ) — nên đánh số
// 01-05 ở đây hợp lý, khác về/pricing/faq (nội dung không tuần tự, không
// đánh số). Motif "vở kẻ lề" dùng lại từ về/billing.
const STEPS: { title: string; body: React.ReactNode }[] = [
    {
        title: 'Dán link, tạo Space',
        body: (
            <>
                Ở trang chủ, dán link video YouTube vào ô tạo nhanh — hệ thống tự lấy tiêu đề, ảnh và tạo Space đầu tiên cho bạn.
                Hiện chỉ hỗ trợ YouTube, và mỗi lần một video (chưa hỗ trợ dán nguyên playlist — dán từng link).
            </>
        ),
    },
    {
        title: 'Sắp xếp chương, bài học, thêm quiz',
        body: (
            <>
                Trong màn hình chỉnh sửa Space, chia nội dung thành chương và bài học theo thứ tự bạn muốn. Mỗi bài có thể là video hoặc quiz —
                quiz có thể tự soạn (tải file câu hỏi lên) hoặc để AI soạn giúp từ chính video/tài liệu trong Space.
                Nếu muốn AI soạn theo yêu cầu riêng (đổi độ dài, giọng văn…), bạn chọn dùng API key AI của mình hoặc trả bằng credit — xem chi tiết ở{' '}
                <a href="/pricing" className="text-ink-accent hover:underline">Bảng giá</a>.
            </>
        ),
    },
    {
        title: 'Vào học',
        body: (
            <>
                Bật <strong className="text-ink-text">chế độ tập trung</strong> để ẩn hết mọi thứ ngoài bài học đang xem. Tiến độ xem được tự lưu lại, không cần bấm gì —
                mở lại Space sau này sẽ vào đúng chỗ bạn dừng. Bạn có thể ghi chú tại đúng mốc thời gian trong video, bấm vào ghi chú để tua lại đúng chỗ đó.
                Bài dạng quiz thì làm trực tiếp trong bài học, bài làm dở được lưu tạm trên máy để không mất khi mất mạng giữa chừng.
            </>
        ),
    },
    {
        title: 'Xem lại tiến độ',
        body: (
            <>
                Trang chủ có mục “Đang học” hiện các Space bạn học dở gần nhất. Vào <strong className="text-ink-text">Học tiếp</strong> để xem toàn bộ Space cùng
                phần trăm hoàn thành thật, lọc theo trạng thái chưa học / đang học / đã xong.
            </>
        ),
    },
    {
        title: 'Chia sẻ hoặc sao chép Space',
        body: (
            <>
                Chủ Space tạo được link chia sẻ — người nhận xem ngay, không cần tài khoản. Muốn giữ một bản để tự chỉnh sửa thì bấm “Sao chép về học” (cần đăng nhập).
                Lưu ý: nội dung AI mà chủ Space gốc trả credit để tạo riêng sẽ không tự sao chép theo — cần tạo lại nếu người sao chép muốn dùng.
            </>
        ),
    },
];

export default function GuideContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        setUser(AuthUtils.getCurrentUser());
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    };

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                <div className="mb-10">
                    <h1 className="text-[clamp(24px,3vw,30px)] font-bold tracking-[-0.015em] text-ink-text leading-tight">
                        Hướng dẫn sử dụng
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        Năm bước từ một cái link tới một Space học xong.
                    </p>
                </div>

                {/* Tuyến hành trình — 5 bước THẬT theo đúng thứ tự dùng app,
                    nên vẽ như 1 tuyến đường có điểm dừng (chấm mực đặc + đường
                    nối đậm) thay vì số mono chìm như /pricing hay /billing.
                    Đây là điểm "đáng nhớ" riêng của trang hướng dẫn. */}
                <section className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden mb-8">
                    {STEPS.map((step, i) => (
                        <div key={step.title} className="flex items-stretch">
                            <div style={{ width: 56 }} className="shrink-0 flex flex-col items-center pt-4">
                                <span className="w-6 h-6 rounded-full bg-ink-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                </span>
                                {i < STEPS.length - 1 && <span className="w-px flex-1 bg-ink-accent/30 mt-1.5" />}
                            </div>
                            <div className={`flex-1 min-w-0 py-4 pl-4 pr-5 ${i < STEPS.length - 1 ? 'border-b border-ink-border' : ''}`}>
                                <h2 className="text-sm font-semibold text-ink-text mb-1">{step.title}</h2>
                                <p className="text-sm text-ink-textMid leading-relaxed">{step.body}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="text-center">
                    <Button
                        onClick={() => router.push('/')}
                        className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-6 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                    >
                        Bắt đầu từ trang chủ
                    </Button>
                </div>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-4 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>
        </div>
    );
}
