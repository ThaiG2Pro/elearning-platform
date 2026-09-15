'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// Trang /guide v3 (2026-09-15) — trả lời đúng một câu: "làm thế nào".
// Bản v2 lặp lại 4 cảnh mockup của /about (chế độ tập trung, quiz, AI,
// chia sẻ) nên hai trang đọc như một. Giờ /about giữ phần "vì sao" (câu
// chuyện + một demo lớn), /guide giữ phần thao tác: một cột đọc cùng ngôn
// ngữ /pricing v3 và /faq v2, mục lục 5 bước có anchor, mỗi bước là một
// hàng định nghĩa (số bước trái, cách làm phải), tên nút thật in đậm đúng
// chữ trên màn hình. Chỉ còn 2 hình mô phỏng ở bước thật sự cần nhìn (cây
// chương/bài, link chia sẻ), không xoay nghiêng, chú thích một lần ở cuối.
// Các giới hạn gom vào một bảng riêng thay vì rải trong đoạn văn, dẫn về
// /faq#<id> cho phần chi tiết — không lặp lại câu trả lời.

interface Step {
    id: string;
    title: string;
    body: React.ReactNode;
    figure?: React.ReactNode;
}

const B = ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-ink-text">{children}</strong>
);

const STEPS: Step[] = [
    {
        id: 'dan-link',
        title: 'Dán link, tạo Space',
        body: (
            <>
                <p>
                    Ở trang chủ, dán link video YouTube vào ô tạo nhanh. Hệ thống tự lấy tiêu đề, ảnh bìa và tạo Space đầu tiên cho bạn.
                </p>
                <p className="mt-2">
                    Xong bước này bạn có hai lối: <B>Học ngay</B> để vào xem luôn, hoặc <B>Thêm quiz trước khi học</B> để soạn thêm ở bước 2.
                </p>
            </>
        ),
    },
    {
        id: 'sap-xep',
        title: 'Sắp xếp chương, bài học, thêm quiz',
        body: (
            <>
                <p>
                    Trong màn hình chỉnh sửa Space, chia nội dung thành chương và bài học theo thứ tự bạn muốn. Mỗi bài là một video hoặc một quiz.
                </p>
                <p className="mt-2">
                    Quiz có hai cách tạo: tự soạn bằng cách tải file câu hỏi lên, hoặc bấm <B>AI tạo quiz cho bài này</B> để soạn từ chính video trong Space.
                </p>
            </>
        ),
        figure: (
            <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden max-w-[360px]">
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
                        <span className="shrink-0 text-[10px] font-semibold text-ink-accent border border-ink-accent/30 rounded-full px-2 py-0.5">
                            AI tạo
                        </span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'vao-hoc',
        title: 'Vào học',
        body: (
            <>
                <p>
                    Bật <B>Chế độ tập trung</B> để ẩn mọi thứ ngoài bài đang xem. Vị trí xem tự lưu, không cần bấm gì. Mở lại Space sau này sẽ vào đúng chỗ bạn dừng.
                </p>
                <p className="mt-2">
                    Ghi chú ghi tại đúng mốc thời gian trong video. Bấm vào ghi chú để tua lại chỗ đó. Bài dạng quiz làm ngay trong bài học, bấm <B>Nộp bài</B> mới chấm điểm cả bài. Bài làm dở được giữ tạm trên máy nếu mất mạng giữa chừng.
                </p>
            </>
        ),
    },
    {
        id: 'tien-do',
        title: 'Xem lại tiến độ',
        body: (
            <p>
                Trang chủ có mục <B>Đang học</B> hiện các Space bạn học dở gần nhất. Vào <B>Học tiếp</B> trên thanh trên để xem toàn bộ Space với phần trăm hoàn thành thật, lọc theo chưa học, đang học, đã xong.
            </p>
        ),
    },
    {
        id: 'chia-se',
        title: 'Chia sẻ hoặc sao chép Space',
        body: (
            <>
                <p>
                    Chủ Space bấm <B>Chia sẻ</B> để lấy link. Người nhận xem ngay, không cần tài khoản, nhưng tiến độ không được lưu.
                </p>
                <p className="mt-2">
                    Muốn giữ một bản riêng để chỉnh sửa và lưu tiến độ, bấm <B>Sao chép về học</B>. Bước này cần đăng nhập. Ai sao chép cùng một Space sẽ thấy tiến độ của nhau ở mục <B>Cùng học</B>.
                </p>
            </>
        ),
        figure: (
            <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm p-4 max-w-[360px]">
                <p className="text-[11px] font-semibold text-ink-textMuted mb-2">Link chia sẻ</p>
                <div className="flex items-stretch gap-2 mb-4">
                    <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-ink-textDim border border-ink-border rounded-ink-sm px-3 py-2">
                        app.example.com/s/8f2a1c
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-ink-text border border-ink-border rounded-ink-sm px-3 py-2">Sao chép</span>
                </div>
                <div className="border-t border-dashed border-ink-border pt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-textMid">Xem thử, chưa lưu tiến độ</span>
                    <span className="shrink-0 text-[11px] font-medium text-white bg-ink-accent rounded-ink-sm px-3 py-1.5">Sao chép về học</span>
                </div>
            </div>
        ),
    },
];

// Giới hạn thật của bản hiện tại. Mỗi dòng dẫn về đúng câu trong /faq nếu
// ở đó có giải thích dài hơn — không viết lại câu trả lời ở đây.
const LIMITS: { label: string; body: string; faqId?: string }[] = [
    {
        label: 'Nguồn hỗ trợ',
        body: 'Hiện chỉ nhận link YouTube, mỗi lần một video. Chưa dán được nguyên playlist, bạn dán từng link rồi sắp vào chương.',
    },
    {
        label: 'AI miễn phí',
        body: 'Quiz theo cấu hình chuẩn miễn phí, có giới hạn lượt mỗi ngày và độ dài video.',
        faqId: 'gioi-han-ngay',
    },
    {
        label: 'AI theo yêu cầu riêng',
        body: 'Đổi độ dài, giọng văn, số câu thì cần API key AI của bạn hoặc trả bằng credit.',
        faqId: 'co-mat-phi-khong',
    },
    {
        label: 'Sao chép Space',
        body: 'Nội dung AI mà chủ Space gốc trả credit để tạo riêng không đi theo bản sao. Người sao chép tạo lại nếu cần.',
        faqId: 'clone-space',
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

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
                <div className="max-w-[60ch]">
                    <h1 className="text-[clamp(26px,3.2vw,36px)] font-bold tracking-[-0.02em] leading-[1.15] text-ink-text">
                        Hướng dẫn sử dụng
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        Năm bước từ một cái link tới một Space học xong. Chữ in đậm là tên nút đúng như trên màn hình.
                    </p>
                </div>

                <nav aria-label="Các bước" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {STEPS.map((s, i) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className="vd-focusable inline-flex items-center gap-1 font-medium text-ink-accent hover:underline"
                        >
                            <span className="font-mono text-[12px] text-ink-textMuted">{i + 1}</span>
                            {s.title}
                            <ChevronRight size={14} className="rotate-90" />
                        </a>
                    ))}
                </nav>

                <dl className="mt-10 border-t border-ink-border">
                    {STEPS.map((s, i) => (
                        <div
                            key={s.id}
                            id={s.id}
                            className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-2 py-7 border-b border-ink-border scroll-mt-20 target:bg-ink-accentA target:-mx-3 target:px-3 rounded-ink-sm"
                        >
                            <dt className="flex items-baseline gap-3 sm:block">
                                <span className="font-mono text-[clamp(28px,3vw,36px)] font-bold leading-none tracking-[-0.03em] text-ink-accent">
                                    {i + 1}
                                </span>
                                <span className="block sm:mt-2 text-[17px] font-bold tracking-[-0.01em] leading-snug text-ink-text">
                                    <a href={`#${s.id}`} className="vd-focusable hover:text-ink-accent">{s.title}</a>
                                </span>
                            </dt>
                            <dd className="text-[14.5px] text-ink-textMid leading-relaxed">
                                {s.body}
                                {s.figure && <figure className="mt-4">{s.figure}</figure>}
                            </dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-2 text-[12px] text-ink-textDim">Hình trong bài là mô phỏng giao diện, không phải ảnh chụp màn hình.</p>

                <section id="gioi-han" className="mt-12 scroll-mt-20">
                    <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink-text">Giới hạn cần biết</h2>
                    <dl className="mt-4 border-t border-ink-border">
                        {LIMITS.map((l) => (
                            <div
                                key={l.label}
                                className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1.5 py-4 border-b border-ink-border"
                            >
                                <dt className="text-[15px] font-semibold text-ink-text leading-snug">{l.label}</dt>
                                <dd className="text-[14.5px] text-ink-textMid leading-relaxed">
                                    {l.body}
                                    {l.faqId && (
                                        <>
                                            {' '}
                                            <a href={`/faq#${l.faqId}`} className="vd-focusable font-medium text-ink-accent hover:underline whitespace-nowrap">
                                                Chi tiết
                                            </a>
                                        </>
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Button
                        onClick={() => router.push('/')}
                        className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                    >
                        Bắt đầu từ trang chủ
                    </Button>
                    <a href="/faq" className="vd-focusable text-sm font-medium text-ink-accent hover:underline">
                        Còn thắc mắc? Xem Hỏi đáp
                    </a>
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>
        </div>
    );
}
