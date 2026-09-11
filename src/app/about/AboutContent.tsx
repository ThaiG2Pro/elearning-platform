'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// Bố cục v4 (2026-09-11) — text rà lại từng câu cùng user (không phải mô tả
// tính năng, bán cảm xúc thật của người dùng): (1) slogan trần, không khung,
// không sub-headline (H1 đứng một mình); (2) câu chuyện founder kể lại đúng
// trải nghiệm thật, chỉ đường kẻ mực dọc, không khung; (3) khối demo — 4 năng
// lực THẬT theo đúng thứ tự đã chốt (không phải "4 ô chia đều"):
//   ① Ghi chú khi xem video → Chế độ tập trung — demo LỚN, đứng riêng, vì
//      đây là combo 2 hành vi thật (ghi chú + chuyển focus mode), không phải
//      "video + quiz" như bản v2 làm sai.
//   ② Làm quiz — trạng thái ĐANG LÀM, CHƯA nộp bài (không dùng màu đúng/sai ở
//      mockup — chấm điểm là theo cả bài khi bấm "Nộp bài", xem
//      QuizService.submitQuiz — bản v3 từng vẽ sai thành chấm tức thì).
//   ③ AI tạo tóm tắt VÀ AI tạo quiz — 2 năng lực AI, không chỉ quiz.
//   ④ Companion "Cùng học" — đúng dữ liệu thật CompanionDto, không phải
//      leaderboard công khai (chỉ ai sao chép cùng dòng Space mới thấy nhau).
// Không GIF/video thật nào được nhúng — mockup dựng bằng token ink-* mô
// phỏng đúng layout thật (đối chiếu spaces/[id]/learn/page.tsx và
// spaces/[id]/page.tsx), có caption ghi rõ. Muốn thay bằng video thật: đổi
// khối mockup mỗi demo thành <video autoplay muted loop playsInline
// poster="...">, giữ nguyên caption (sửa lại chữ cho khớp) — tránh .gif thật
// vì nặng tải hơn nhiều lần cho cùng hiệu ứng động (VPS nhỏ, xem SURVIVAL.md).

const QUIZ_OPTIONS = [
    { label: 'Một hàm JS trả về HTML', correct: false },
    { label: 'Một khối JSX mô tả UI, được React dựng thành DOM', correct: true },
    { label: 'Một file CSS module', correct: false },
];

// Đúng dữ liệu thật từ CompanionDto (WP1.7): tên + completionRate + isSelf,
// sắp xếp giảm dần theo completionRate — không avatar, không huy chương,
// không phải leaderboard công khai (chỉ member cùng dòng clone thấy nhau).
const COMPANION_ROWS = [
    { name: 'Minh Anh', completion: 82, isSelf: false },
    { name: 'Bạn', completion: 55, isSelf: true },
    { name: 'Quốc Bảo', completion: 30, isSelf: false },
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

            <main className="flex-1 max-w-[1000px] mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                {/* ── 1. Slogan — chữ trần, không khung, nặng nhất trang.
                    Không còn sub-headline giải thích cơ chế (bỏ theo yêu cầu
                    2026-09-11 — H1 đứng một mình, đủ nói hết giá trị cốt lõi). ── */}
                <section className="vd-ink-in mb-12 md:mb-16">
                    <h1 className="text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink-text leading-[1.2]">
                        Xem đến đâu, nhớ đến đó — chỉ cần link.
                    </h1>
                    <p className="mt-4 text-sm font-semibold text-ink-accent leading-relaxed">
                        Miễn phí. Không quảng cáo gián đoạn. Không bỏ dở giữa chừng. Không học xong và quên. Không cô đơn.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                        >
                            Xem các Spaces nổi bật
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
                </section>

                {/* ── 2. Câu chuyện founder — chỉ đường kẻ mực dọc, KHÔNG khung.
                    Bản 2026-09-11: viết lại theo đúng chất liệu founder kể
                    trực tiếp (không phải suy diễn) — trọng tâm không phải
                    "quên video nào" ngay lúc xem, mà là lần sau quay lại,
                    lịch sử xem lẫn lộn giữa học nghiêm túc và xem cho vui,
                    không lọc ra được. ── */}
                <section className="relative mb-16 md:mb-24">
                    {/* Dòng kẻ đặt absolute ra ngoài cột text (không chiếm
                        chỗ trong flex như bản cũ) — text vẫn thẳng hàng lề
                        trái với H1 ở section 1, dòng kẻ nằm ở gutter bên
                        trái, cách text đúng khoảng cách cũ (24px = mr-6). */}
                    <span aria-hidden className="hidden sm:block absolute top-0 bottom-0 -left-6 w-px bg-ink-marginLn" />
                    <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-semibold text-ink-text leading-snug">
                            Trước khi làm sản phẩm này, tôi học theo cách hầu hết mọi người đang học: mở một video, ghi chú vào một chỗ khác, xem xong thì chuyển sang video kế tiếp.
                        </p>
                        <p className="mt-4 text-sm text-ink-textMid leading-relaxed">
                            Nhưng cái tôi chuyển sang phần nhiều là do YouTube gợi ý — một tiêu đề giật hơn, một chủ đề chẳng liên quan, đôi khi là quảng cáo chen ngang. Lần sau quay lại, lịch sử xem lẫn lộn giữa video học nghiêm túc và video xem cho vui — chẳng còn cách nào lọc ra đâu là buổi mình thật sự đang học.
                        </p>
                        <p className="mt-4 text-sm text-ink-textMid leading-relaxed">
                            Kiến thức miễn phí không thiếu — thiếu là một chỗ để học nó nghiêm túc. Nên tôi làm ra chỗ đó cho chính mình học trước — giờ vẫn đang dùng nó mỗi ngày.
                        </p>
                    </div>
                </section>

                {/* ── 3. Demo — 4 năng lực thật, không chia đều. ── */}
                <section className="mb-16 md:mb-24">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-textMuted mb-6">
                        Chỗ đó tôi gọi là Space, và nó trông như này
                    </p>

                    {/* ① Ghi chú khi xem video → Chế độ tập trung — demo lớn,
                        đứng riêng khỏi ②③④, nhưng VẪN 2 cột text/media tách
                        bạch như 3 demo dưới (trước đây bị xếp chồng chung 1
                        cột — text đè lên trên media — nay sửa lại). */}
                    <div className="mb-14 md:mb-20 md:grid md:grid-cols-12 md:gap-8 items-stretch">
                        {/* Trục text lệch về mép trên (35/65), không cách đều
                            2 mép — 2 spacer flex-grow 35/65 chia phần trống
                            còn lại sau khi trừ chiều cao text, bất kể media
                            cao bao nhiêu (chỉ có tác dụng từ md — spacer ẩn ở
                            mobile để không ảnh hưởng layout xếp chồng). */}
                        <div className="md:col-span-5 md:flex md:flex-col">
                            <div className="hidden md:block" style={{ flexGrow: 35 }} aria-hidden />
                            <p className="text-lg sm:text-xl font-semibold text-ink-text leading-snug">
                                Ý nào nảy ra lúc đang xem, giữ ngay tại đó — không lạc đi đâu mất. Cần tập trung hơn, gạt hết phần còn lại, chỉ còn video và ghi chú của bạn.
                            </p>
                            <div className="hidden md:block" style={{ flexGrow: 65 }} aria-hidden />
                        </div>
                        <div className="md:col-span-7 mt-6 md:mt-0">
                            <div className="rotate-[-0.5deg] bg-ink-room rounded-ink-lg shadow-ink-md overflow-hidden p-5 relative max-w-[460px]">
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
                                <span className="absolute top-4 right-4 text-[10px] font-mono text-ink-screenTextMuted bg-black/40 rounded-full px-2 py-0.5">2/3 bài · 1 ghi chú</span>
                            </div>
                            <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                        </div>
                    </div>

                    {/* ②③④ — 3 demo nhỏ hơn, xen kẽ trái/phải trên desktop; trên
                        mobile CHỮ luôn đứng trước ảnh ở cả 3 hàng. */}
                    <div className="space-y-12 md:space-y-16">
                        {/* ② Làm quiz — trạng thái ĐANG LÀM, chưa nộp bài. Quan
                            trọng: chấm điểm là theo CẢ BÀI (bấm "Nộp bài" mới
                            biết đúng/sai — xem QuizService.submitQuiz), không
                            phải chấm tức thì từng câu. Mockup vì vậy KHÔNG
                            dùng màu đúng/sai (ink-correct/ink-wrong) ở đây —
                            chỉ có trạng thái "đã chọn" trung tính, giống hệt
                            màn hình học viên thấy trước khi nộp bài. */}
                        <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                            <div className="md:col-span-7 md:order-1">
                                <div className="rotate-[-0.4deg] bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden p-5 max-w-[420px]">
                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                        <p className="text-sm font-semibold text-ink-text">JSX trong React là gì?</p>
                                        <span className="text-[11px] font-mono text-ink-textDim shrink-0">Câu 3/5</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {QUIZ_OPTIONS.map((opt, i) => (
                                            <div
                                                key={opt.label}
                                                className={`text-xs rounded-ink-md px-3 py-2 border ${
                                                    i === 1
                                                        ? 'border-ink-accent bg-ink-page text-ink-text font-medium'
                                                        : 'border-ink-border text-ink-textDim'
                                                }`}
                                            >
                                                {opt.label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3.5 flex justify-end">
                                        <span className="text-[11px] font-medium text-white bg-ink-accent/70 rounded-ink-md px-3 py-1.5">
                                            Nộp bài
                                        </span>
                                    </div>
                                </div>
                                <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                            </div>
                            <div className="md:col-span-5 md:order-2 mt-5 md:mt-0">
                                <p className="text-sm font-semibold text-ink-text mb-1.5">Tự kiểm tra mình</p>
                                <p className="text-sm text-ink-textMid leading-relaxed">
                                    Xem xong, đừng vội tin là mình đã hiểu — làm ngay một bài quiz ngắn dưới video, nộp bài để biết chắc mình hiểu tới đâu.
                                </p>
                            </div>
                        </div>

                        {/* ③ AI tạo tóm tắt VÀ AI tạo quiz — 2 năng lực AI, không
                            chỉ mỗi quiz. */}
                        <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                            <div className="md:col-span-5 md:order-1">
                                <p className="text-sm font-semibold text-ink-text mb-1.5">AI tạo tóm tắt và quiz</p>
                                <p className="text-sm text-ink-textMid leading-relaxed">
                                    Không cần tự tóm tắt hay tự soạn câu hỏi. AI tạo cả hai từ chính video bạn đang xem.
                                </p>
                            </div>
                            <div className="md:col-span-7 md:order-2 mt-5 md:mt-0">
                                <div className="rotate-[0.4deg] bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden max-w-[420px]">
                                    <div className="p-4 border-b border-ink-border">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <p className="text-xs text-ink-textMuted">Tóm tắt bài học</p>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-accent border border-ink-accent/30 rounded-full px-2 py-0.5">
                                                ✨ AI tạo tóm tắt
                                            </span>
                                        </div>
                                        <p className="text-xs text-ink-textMid leading-relaxed">
                                            JSX là cú pháp mở rộng của JavaScript, cho phép viết cấu trúc giống HTML ngay trong component — React dựng nó thành DOM thật.
                                        </p>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <p className="text-xs text-ink-textMuted">Quiz ôn tập</p>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-accent border border-ink-accent/30 rounded-full px-2 py-0.5">
                                                ✨ AI tạo quiz
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-ink-text mb-2">JSX trong React là gì?</p>
                                        <div className="space-y-1.5">
                                            {QUIZ_OPTIONS.map((opt) => (
                                                <div key={opt.label} className="text-xs rounded-ink-md px-3 py-2 border border-ink-border text-ink-textMid">
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                            </div>
                        </div>

                        {/* ④ Companion — đúng dữ liệu thật CompanionDto: tên +
                            completionRate + isSelf, KHÔNG phải leaderboard công
                            khai (chỉ ai cùng dòng clone Space mới thấy nhau). */}
                        <div className="md:grid md:grid-cols-12 md:gap-8 items-center">
                            <div className="md:col-span-7 md:order-1">
                                <div className="rotate-[0.3deg] bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm p-5 max-w-[420px]">
                                    <p className="text-sm font-semibold text-ink-text mb-3">Cùng học</p>
                                    <ul className="space-y-2.5">
                                        {COMPANION_ROWS.map((c) => (
                                            <li key={c.name} className="flex items-center gap-3">
                                                <span className="text-sm text-ink-text truncate flex-1 min-w-0">
                                                    {c.name}
                                                    {c.isSelf && <span className="text-ink-textMuted"> (Bạn)</span>}
                                                </span>
                                                <span className="w-28 h-1.5 bg-ink-page rounded-full shrink-0 relative overflow-hidden">
                                                    <span className="absolute inset-y-0 left-0 bg-ink-accent rounded-full" style={{ width: `${c.completion}%` }} />
                                                </span>
                                                <span className="text-xs font-medium text-ink-textMuted w-9 text-right shrink-0">{c.completion}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="mt-3 text-[11px] text-ink-textDim">Mô phỏng giao diện thật, không phải ảnh/video chụp màn hình.</p>
                            </div>
                            <div className="md:col-span-5 md:order-2 mt-5 md:mt-0">
                                <p className="text-sm font-semibold text-ink-text mb-1.5">Học cùng ai đó, không học một mình</p>
                                <p className="text-sm text-ink-textMid leading-relaxed">
                                    Chia sẻ Space cho bạn bè hoặc một nhóm nhỏ — ai sao chép theo, tiến độ của mọi người hiện ra cạnh nhau, dù mỗi người vẫn học trên bản của riêng mình.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 4. Kết — chỉ còn nút, không câu dẫn (bỏ theo yêu cầu
                    2026-09-11: câu cũ "mất chưa đến một phút" là cam kết định
                    lượng không kiểm chứng được). Bỏ luôn đường kẻ mực đi kèm
                    vì nó chỉ có nghĩa khi đứng cạnh một đoạn text/quote. ── */}
                <section className="mb-4">
                    <Button
                        onClick={() => router.push('/')}
                        className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-6 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                    >
                        Tạo Space đầu tiên
                    </Button>
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
