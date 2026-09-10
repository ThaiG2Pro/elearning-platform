'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// "Trang vở đang mở" — hero duy nhất của trang, không phải 3 card lặp lại
// đánh số §1/§2/§3 (bản trước đó là SaaS-card-kit mặc áo đúng token, cấu
// trúc vẫn generic). Cột trái là trang bìa (giọng trực tiếp), cột phải là
// MỘT Space mẫu có thật đang mở — gáy sách là đường kẻ mực, không phải viền
// card. Số thứ tự 01/02/03 CHỈ dùng ở đây vì đây là chuỗi bài học thật.
const SAMPLE_LESSONS = [
    { n: '01', title: 'Cài đặt dự án', type: 'video', state: 'done' as const },
    { n: '02', title: 'Component đầu tiên', type: 'video', state: 'current' as const,
      note: 'ghi chú: so sánh với class component ở bài trước' },
    { n: '03', title: 'Ôn tập: JSX cơ bản', type: 'quiz', state: 'upcoming' as const },
];

export default function AboutContent() {
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

            <main className="flex-1 max-w-[900px] mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                {/* ── Hero: trang vở đang mở ── */}
                <section className="vd-ink-in relative bg-ink-panel rounded-ink-lg shadow-ink-md overflow-hidden mb-12 md:mb-16">
                    <div className="grid md:grid-cols-2">
                        {/* Trang trái */}
                        <div className="p-7 sm:p-10 flex flex-col">
                            <h1 className="text-[clamp(24px,3.2vw,32px)] font-bold tracking-[-0.015em] text-ink-text leading-[1.3]">
                                Bạn có video, có tài liệu. Cái thiếu là một chỗ học hết chúng, không bỏ dở giữa chừng.
                            </h1>
                            <p className="mt-4 text-[15px] text-ink-textMid leading-relaxed max-w-[440px]">
                                Space gom video hoặc tài liệu bạn chọn vào một chỗ. Chia chương, thêm quiz, nhớ đúng dòng bạn đang xem — mở lại là học tiếp, không phải lục lại.
                            </p>
                            <div className="mt-auto pt-8 flex flex-wrap gap-3">
                                <Button
                                    onClick={() => router.push('/')}
                                    className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                                >
                                    Khám phá Space
                                </Button>
                                {user ? (
                                    <Button
                                        onClick={() => router.push('/my-learning')}
                                        variant="outline"
                                        className="border-ink-border text-ink-text hover:bg-ink-page font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                                    >
                                        Space của tôi
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleJoin}
                                        variant="outline"
                                        className="border-ink-border text-ink-text hover:bg-ink-page font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                                    >
                                        Tham gia ngay
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Gáy sách — đường kẻ mực + bóng gutter mờ, chỉ hiện trên md+ */}
                        <div
                            className="hidden md:block absolute top-0 bottom-0 left-1/2 w-6 -translate-x-1/2 pointer-events-none"
                            style={{ background: 'linear-gradient(to right, transparent, rgba(33,38,51,0.07), transparent)' }}
                        />
                        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-ink-accent/25" />
                        {/* Gáy sách ngang trên mobile */}
                        <div className="md:hidden h-px bg-ink-accent/25 mx-7" />

                        {/* Trang phải — Space mẫu có thật đang mở */}
                        <div className="p-7 sm:p-10 bg-ink-page/60">
                            <p className="text-xs text-ink-textMuted mb-3">Một Space trông như vầy</p>
                            <h2 className="text-base font-bold text-ink-text mb-3">Nhập môn React</h2>

                            <div>
                                {SAMPLE_LESSONS.map((l) => (
                                    <div key={l.n} className="flex items-stretch">
                                        <span
                                            style={{ width: 40 }}
                                            className="shrink-0 flex items-start justify-center pt-[3px] font-mono text-[11px] text-ink-textDim"
                                        >
                                            {l.state === 'done' ? '✓' : l.n}
                                        </span>
                                        <div className="flex-1 min-w-0 border-l border-ink-marginLn pl-3 pb-4">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className={
                                                    l.state === 'current'
                                                        ? 'text-sm font-semibold text-ink-accent'
                                                        : l.state === 'done'
                                                            ? 'text-sm text-ink-textMuted'
                                                            : 'text-sm text-ink-textMid'
                                                }>
                                                    {l.title}
                                                </span>
                                                <span className="shrink-0 text-ink-textDim text-[11px] font-mono">{l.type}</span>
                                            </div>
                                            {l.state === 'current' && (
                                                <p className="mt-1 text-xs italic text-ink-textMuted">{l.note}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-ink-textMuted pl-10">Đang ở bài 2 trên 3.</p>
                        </div>
                    </div>
                </section>

                {/* ── Chế độ tập trung — bằng chứng cụ thể, nhỏ và trầm hơn hero ── */}
                <section className="bg-ink-room rounded-ink-md p-6 sm:p-7 mb-12 md:mb-16">
                    <p className="text-sm text-ink-screenText font-semibold mb-1">Chế độ tập trung</p>
                    <p className="text-sm text-ink-screenTextMid leading-relaxed max-w-[520px]">
                        Khi bạn học, giao diện tắt hết những gì không phải bài học. Vị trí xem được lưu tự động — không cần bấm gì.
                    </p>
                    <div className="mt-4 flex items-center gap-3 max-w-[400px]">
                        <div className="flex-1 h-1 rounded-full bg-white/10 relative">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-ink-accentScreen" style={{ width: '42%' }} />
                        </div>
                        <span className="font-mono text-[11px] text-ink-screenTextMuted">12:34 / 29:10 — đã lưu</span>
                    </div>
                </section>

                {/* ── Kết — không card, chỉ một dòng và một nút ── */}
                <section className="text-center max-w-md mx-auto pb-4">
                    <p className="text-ink-textMid text-sm">
                        Dán một link, đặt tên Space — mất chưa đến một phút để bắt đầu.
                    </p>
                    <div className="mt-4">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-6 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                        >
                            Tạo Space đầu tiên
                        </Button>
                    </div>
                </section>
            </main>

            {/* Footer — chỉ copyright; nav Trang chủ/Về chúng tôi đã có trong
                Header (TopBar), không lặp lại ở đây. */}
            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-4 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>
        </div>
    );
}
