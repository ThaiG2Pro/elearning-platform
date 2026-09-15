'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// Trang /about v5 (2026-09-15) — chỉ trả lời "vì sao có sản phẩm này".
// Bản v4 có 4 demo mockup (tập trung, quiz, AI, cùng học) trùng gần hết
// với /guide, hai trang đọc như một. Giờ phần "làm thế nào" nằm trọn ở
// /guide; /about giữ: slogan, câu chuyện founder (nguyên văn đã rà cùng
// user 2026-09-11), MỘT demo lớn duy nhất là chế độ tập trung (điểm nhấn
// của trang, vì đó là cảnh gói đủ ý "xem đến đâu, nhớ đến đó"), và bảng
// những điều nền tảng giữ với người học — mỗi dòng dẫn về /faq nếu cần
// giải thích dài. Cột đọc, cỡ chữ, bảng định nghĩa cùng ngôn ngữ /pricing
// v3, /faq v2, /guide v3.

const PROMISES: { label: string; body: string; faqId?: string }[] = [
    {
        label: 'Miễn phí để học',
        body: 'Tạo Space, xem, ghi chú, làm quiz, theo dõi tiến độ không mất tiền. Chỉ trả khi muốn AI tạo nội dung theo yêu cầu riêng mà không dùng key của bạn.',
        faqId: 'co-mat-phi-khong',
    },
    {
        label: 'Không quảng cáo chen ngang',
        body: 'Trong Space chỉ có video của bạn, ghi chú của bạn và bài quiz. Không gợi ý video khác, không banner.',
    },
    {
        label: 'Dữ liệu là của bạn',
        body: 'Tải về một bản JSON đầy đủ hồ sơ, Space, tiến độ, ghi chú bất cứ lúc nào. Xoá tài khoản là xoá thật.',
        faqId: 'xoa-tk',
    },
    {
        label: 'Không học một mình',
        body: 'Chia sẻ Space cho bạn bè. Ai sao chép cùng một Space thấy tiến độ của nhau, dù mỗi người học trên bản riêng.',
        faqId: 'chia-se-space',
    },
];

export default function AboutContent() {
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

    const handleJoin = () => router.push('/join');

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
                {/* 1. Slogan, chữ trần. H1 đứng một mình theo quyết định 2026-09-11. */}
                <section className="max-w-[62ch]">
                    <h1 className="text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] leading-[1.15] text-ink-text text-balance">
                        Xem đến đâu, nhớ đến đó. Chỉ cần link.
                    </h1>
                    <p className="mt-4 text-[15px] text-ink-textMid leading-relaxed">
                        Dán một link YouTube là có một chỗ để học nó nghiêm túc: ghi chú theo mốc thời gian, quiz tự kiểm tra, tiến độ tự lưu.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                        >
                            Tạo Space đầu tiên
                        </Button>
                        <Button
                            onClick={() => router.push('/guide')}
                            variant="outline"
                            className="border-ink-border text-ink-text hover:bg-ink-page font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                        >
                            Xem cách dùng
                        </Button>
                    </div>
                </section>

                {/* 2. Câu chuyện founder, đường kẻ mực dọc, không khung. */}
                <section className="relative mt-14 md:mt-20 max-w-[62ch]">
                    <span aria-hidden className="hidden sm:block absolute top-0 bottom-0 -left-6 w-px bg-ink-marginLn" />
                    <p className="text-[13px] text-ink-textMuted">Vì sao có trang này</p>
                    <p className="mt-2 text-lg sm:text-xl font-semibold text-ink-text leading-snug tracking-[-0.01em]">
                        Trước khi làm sản phẩm này, tôi học theo cách hầu hết mọi người đang học: mở một video, ghi chú vào một chỗ khác, xem xong thì chuyển sang video kế tiếp.
                    </p>
                    <p className="mt-4 text-[14.5px] text-ink-textMid leading-relaxed">
                        Nhưng cái tôi chuyển sang phần nhiều là do YouTube gợi ý. Một tiêu đề giật hơn, một chủ đề chẳng liên quan, đôi khi là quảng cáo chen ngang. Lần sau quay lại, lịch sử xem lẫn lộn giữa video học nghiêm túc và video xem cho vui, chẳng còn cách nào lọc ra đâu là buổi mình thật sự đang học.
                    </p>
                    <p className="mt-4 text-[14.5px] text-ink-textMid leading-relaxed">
                        Kiến thức miễn phí không thiếu. Thiếu là một chỗ để học nó nghiêm túc. Nên tôi làm ra chỗ đó cho chính mình học trước, và giờ vẫn đang dùng nó mỗi ngày.
                    </p>
                </section>

                {/* 3. Điểm nhấn duy nhất: chế độ tập trung. Mockup dựng bằng
                    token ink-*, đối chiếu spaces/[id]/learn. */}
                <section className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-10 gap-y-6 items-center">
                    <div>
                        <p className="text-[13px] text-ink-textMuted">Chỗ đó tôi gọi là Space</p>
                        <h2 className="mt-2 text-[19px] font-bold tracking-[-0.01em] text-ink-text leading-snug">
                            Ý nào nảy ra lúc đang xem, giữ ngay tại đó
                        </h2>
                        <p className="mt-3 text-[14.5px] text-ink-textMid leading-relaxed">
                            Ghi chú gắn vào đúng giây đang xem, bấm vào là tua lại. Cần tập trung hơn thì gạt hết phần còn lại, chỉ còn video và ghi chú của bạn.
                        </p>
                    </div>
                    <figure>
                        <div className="rotate-[-0.5deg] bg-ink-room rounded-ink-lg shadow-ink-md overflow-hidden p-5 relative">
                            <div className="flex items-center gap-1.5 mb-4">
                                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-ink-screenTextMuted border border-ink-screenBorder rounded-full px-2 py-0.5">
                                    Chế độ tập trung
                                </span>
                            </div>
                            <div className="aspect-video rounded-ink-md bg-black/30 flex items-center justify-center">
                                <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-ink-screenText text-lg">▶</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-white/15 relative">
                                    <div className="absolute inset-y-0 left-0 rounded-full bg-ink-accentScreen" style={{ width: '42%' }} />
                                </div>
                                <span className="font-mono text-[11px] text-ink-screenTextDim shrink-0">12:34 / 29:10</span>
                            </div>
                            <div className="mt-4 bg-ink-panel rounded-ink-md shadow-ink-sm p-3 max-w-[380px]">
                                <div className="flex items-stretch">
                                    <span style={{ width: 32 }} className="shrink-0 font-mono text-[10px] text-ink-textDim pt-0.5">12:34</span>
                                    <p className="flex-1 min-w-0 border-l border-ink-marginLn pl-2.5 text-xs text-ink-textMid">so sánh với class component ở bài trước</p>
                                </div>
                            </div>
                        </div>
                        <figcaption className="mt-3 text-[12px] text-ink-textDim">Mô phỏng giao diện, không phải ảnh chụp màn hình.</figcaption>
                    </figure>
                </section>

                {/* 4. Những điều nền tảng giữ với người học. */}
                <section className="mt-14 md:mt-20">
                    <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink-text">Những điều chúng tôi giữ</h2>
                    <dl className="mt-4 border-t border-ink-border">
                        {PROMISES.map((p) => (
                            <div
                                key={p.label}
                                className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1.5 py-5 border-b border-ink-border"
                            >
                                <dt className="text-[15px] font-semibold text-ink-text leading-snug">{p.label}</dt>
                                <dd className="text-[14.5px] text-ink-textMid leading-relaxed">
                                    {p.body}
                                    {p.faqId && (
                                        <>
                                            {' '}
                                            <a href={`/faq#${p.faqId}`} className="vd-focusable font-medium text-ink-accent hover:underline whitespace-nowrap">
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
                        Tạo Space đầu tiên
                    </Button>
                    {user ? (
                        <a href="/my-learning" className="vd-focusable text-sm font-medium text-ink-accent hover:underline">Space của tôi</a>
                    ) : (
                        <a href="/join" className="vd-focusable text-sm font-medium text-ink-accent hover:underline">Tham gia miễn phí</a>
                    )}
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>
        </div>
    );
}
