'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// 2026-09-11 (v2) — bản cũ chỉ là 1 danh sách 5 dòng text cạnh số thứ tự,
// không có "điểm nhấn" nào để nhớ (khác /about — 4 demo mockup, và
// home/learn/edit — UI thật với ticket/ribbon, ink-room, quiz card...).
// Sửa lại: mỗi bước giờ có 1 mockup dựng từ chính token ink-* + bố cục
// đã dùng thật ở app (paste-box+created-card của trang chủ, ink-room
// focus mode + quiz "đang làm" của /about, ticket % của "Tiếp tục học"),
// xen kẽ trái/phải như demo ②③④ ở /about — KHÔNG dựng ảnh/video chụp màn
// hình thật, chỉ mô phỏng bằng div/token để không lệch khi UI thật đổi.
// Nội dung 5 bước giữ nguyên 100% (đã verify đúng luồng thật ở bản v1).

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

            <main className="flex-1 max-w-[1000px] mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                <div className="mb-12 md:mb-16">
                    <h1 className="text-[clamp(24px,3vw,30px)] font-bold tracking-[-0.015em] text-ink-text leading-tight">
                        Hướng dẫn sử dụng
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        Năm bước từ một cái link tới một Space học xong.
                    </p>
                </div>

                <div className="space-y-12 md:space-y-16">
                    {/* ① Dán link, tạo Space — mockup: paste-box → card "Đã tạo
                        Space" (nguyên bản dùng ở trang chủ). */}
                    <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                        <div className="md:col-span-7 md:order-1">
                            <div className="rotate-[-0.4deg] bg-ink-panel border border-ink-correct/30 rounded-ink-lg shadow-ink-md overflow-hidden p-5 max-w-[420px]">
                                <p className="text-[11px] font-semibold text-ink-correct uppercase tracking-wide mb-1.5">Đã tạo Space</p>
                                <p className="text-sm font-bold text-ink-text mb-3">React Hooks giải thích dễ hiểu trong 20 phút</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[11px] font-medium text-white bg-ink-accent rounded-ink-md px-3 py-1.5">Học ngay</span>
                                    <span className="text-[11px] font-medium text-ink-text border border-ink-border rounded-ink-md px-3 py-1.5">Thêm quiz/tóm tắt trước khi học</span>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                        <div className="md:col-span-5 md:order-2 mt-5 md:mt-0">
                            <p className="text-xs font-bold text-ink-accent uppercase tracking-wide mb-1.5">Bước 1</p>
                            <p className="text-sm font-semibold text-ink-text mb-1.5">Dán link, tạo Space</p>
                            <p className="text-sm text-ink-textMid leading-relaxed">
                                Ở trang chủ, dán link video YouTube vào ô tạo nhanh — hệ thống tự lấy tiêu đề, ảnh và tạo Space đầu tiên cho bạn.
                                Hiện chỉ hỗ trợ YouTube, và mỗi lần một video (chưa hỗ trợ dán nguyên playlist — dán từng link).
                            </p>
                        </div>
                    </div>

                    {/* ② Sắp xếp chương, bài học, thêm quiz — mockup: cây
                        chương/bài với 1 bài dạng quiz (badge AI tạo). */}
                    <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                        <div className="md:col-span-5 md:order-1">
                            <p className="text-xs font-bold text-ink-accent uppercase tracking-wide mb-1.5">Bước 2</p>
                            <p className="text-sm font-semibold text-ink-text mb-1.5">Sắp xếp chương, bài học, thêm quiz</p>
                            <p className="text-sm text-ink-textMid leading-relaxed">
                                Trong màn hình chỉnh sửa Space, chia nội dung thành chương và bài học theo thứ tự bạn muốn. Mỗi bài có thể là video hoặc quiz —
                                quiz có thể tự soạn (tải file câu hỏi lên) hoặc để AI soạn giúp từ chính video/tài liệu trong Space.
                                Nếu muốn AI soạn theo yêu cầu riêng (đổi độ dài, giọng văn…), bạn chọn dùng API key AI của mình hoặc trả bằng credit — xem chi tiết ở{' '}
                                <a href="/pricing" className="text-ink-accent hover:underline">Bảng giá</a>.
                            </p>
                        </div>
                        <div className="md:col-span-7 md:order-2 mt-5 md:mt-0">
                            <div className="rotate-[0.4deg] bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden max-w-[420px]">
                                <p className="text-xs font-semibold text-ink-textMuted px-4 pt-3 pb-2">Chương 1</p>
                                <div className="border-t border-ink-border">
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-ink-border">
                                        <span className="text-ink-textDim text-sm shrink-0">▶</span>
                                        <span className="text-sm text-ink-text flex-1 min-w-0 truncate">Giới thiệu Hooks là gì</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-ink-border">
                                        <span className="text-ink-textDim text-sm shrink-0">▶</span>
                                        <span className="text-sm text-ink-text flex-1 min-w-0 truncate">useState và useEffect</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 px-4 py-2.5">
                                        <span className="text-ink-accent text-sm shrink-0">?</span>
                                        <span className="text-sm text-ink-text flex-1 min-w-0 truncate">Quiz ôn tập</span>
                                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-accent border border-ink-accent/30 rounded-full px-2 py-0.5">
                                            ✨ AI tạo
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                    </div>

                    {/* ③ Vào học — mockup: chế độ tập trung (ink-room screen),
                        cùng motif với demo ① của /about — vì đây đúng là 1
                        cảnh, không phải trùng lặp vô cớ. */}
                    <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                        <div className="md:col-span-7 md:order-1">
                            <div className="rotate-[-0.3deg] bg-ink-room rounded-ink-lg shadow-ink-md overflow-hidden p-5 relative max-w-[420px]">
                                <div className="flex items-center gap-1.5 mb-4">
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-ink-screenTextMuted border border-ink-screenBorder rounded-full px-2 py-0.5">
                                        ⤢ Chế độ tập trung
                                    </span>
                                </div>
                                <div className="aspect-video rounded-ink-md bg-black/30 flex items-center justify-center">
                                    <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-ink-screenText text-lg">▶</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-1 rounded-full bg-white/15 relative">
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-ink-accentScreen" style={{ width: '68%' }} />
                                    </div>
                                    <span className="font-mono text-[11px] text-ink-screenTextDim shrink-0">Tự lưu vị trí</span>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                        <div className="md:col-span-5 md:order-2 mt-5 md:mt-0">
                            <p className="text-xs font-bold text-ink-accent uppercase tracking-wide mb-1.5">Bước 3</p>
                            <p className="text-sm font-semibold text-ink-text mb-1.5">Vào học</p>
                            <p className="text-sm text-ink-textMid leading-relaxed">
                                Bật <strong className="text-ink-text">chế độ tập trung</strong> để ẩn hết mọi thứ ngoài bài học đang xem. Tiến độ xem được tự lưu lại, không cần bấm gì —
                                mở lại Space sau này sẽ vào đúng chỗ bạn dừng. Bạn có thể ghi chú tại đúng mốc thời gian trong video, bấm vào ghi chú để tua lại đúng chỗ đó.
                                Bài dạng quiz thì làm trực tiếp trong bài học, bài làm dở được lưu tạm trên máy để không mất khi mất mạng giữa chừng.
                            </p>
                        </div>
                    </div>

                    {/* ④ Xem lại tiến độ — mockup: thẻ "Đang học" rút gọn từ
                        đúng UI thật của trang chủ (ribbon % + tên Space). */}
                    <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                        <div className="md:col-span-5 md:order-1">
                            <p className="text-xs font-bold text-ink-accent uppercase tracking-wide mb-1.5">Bước 4</p>
                            <p className="text-sm font-semibold text-ink-text mb-1.5">Xem lại tiến độ</p>
                            <p className="text-sm text-ink-textMid leading-relaxed">
                                Trang chủ có mục "Đang học" hiện các Space bạn học dở gần nhất. Vào <strong className="text-ink-text">Học tiếp</strong> để xem toàn bộ Space cùng
                                phần trăm hoàn thành thật, lọc theo trạng thái chưa học / đang học / đã xong.
                            </p>
                        </div>
                        <div className="md:col-span-7 md:order-2 mt-5 md:mt-0">
                            <div className="rotate-[0.3deg] relative bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden p-5 max-w-[420px]">
                                <span
                                    className="absolute top-0 right-6 w-[26px] h-9 bg-ink-accent flex items-start justify-center pt-1.5"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                                >
                                    <span className="font-mono text-[9px] font-bold text-white">72%</span>
                                </span>
                                <p className="text-[11px] font-medium text-ink-textMuted mb-1">Đang học</p>
                                <p className="text-sm font-bold text-ink-text mb-2">React Hooks giải thích dễ hiểu trong 20 phút</p>
                                <p className="text-xs text-ink-textMuted">6 bài · đã xong 4</p>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                    </div>

                    {/* ⑤ Chia sẻ hoặc sao chép Space — mockup: link chia sẻ +
                        thao tác "Sao chép về học" phía người nhận. */}
                    <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                        <div className="md:col-span-7 md:order-1">
                            <div className="rotate-[-0.3deg] bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden p-5 max-w-[420px]">
                                <p className="text-[11px] font-semibold text-ink-textMuted mb-2">Link chia sẻ</p>
                                <div className="flex items-stretch gap-2 mb-4">
                                    <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-ink-textDim border border-ink-border rounded-ink-md px-3 py-2">
                                        app.example.com/s/8f2a1c
                                    </span>
                                    <span className="shrink-0 text-[11px] font-medium text-ink-text border border-ink-border rounded-ink-md px-3 py-2">Sao chép</span>
                                </div>
                                <div className="border-t border-dashed border-ink-border pt-4 flex items-center justify-between gap-3">
                                    <span className="text-xs text-ink-textMid">Xem thử — chưa lưu tiến độ</span>
                                    <span className="shrink-0 text-[11px] font-medium text-white bg-ink-accent rounded-ink-md px-3 py-1.5">Sao chép về học</span>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                        <div className="md:col-span-5 md:order-2 mt-5 md:mt-0">
                            <p className="text-xs font-bold text-ink-accent uppercase tracking-wide mb-1.5">Bước 5</p>
                            <p className="text-sm font-semibold text-ink-text mb-1.5">Chia sẻ hoặc sao chép Space</p>
                            <p className="text-sm text-ink-textMid leading-relaxed">
                                Chủ Space tạo được link chia sẻ — người nhận xem ngay, không cần tài khoản. Muốn giữ một bản để tự chỉnh sửa thì bấm "Sao chép về học" (cần đăng nhập).
                                Lưu ý: nội dung AI mà chủ Space gốc trả credit để tạo riêng sẽ không tự sao chép theo — cần tạo lại nếu người sao chép muốn dùng.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-16 md:mt-20">
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
