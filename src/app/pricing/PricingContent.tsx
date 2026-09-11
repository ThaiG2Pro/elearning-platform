'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { CREDIT_PACKAGE_OPTIONS } from '@/lib/billing';
import { ALL_QUESTIONS } from '@/content/faq';

// Bố cục theo đúng thứ tự câu hỏi người đọc thật sự có, không phải thứ tự
// "đẹp" theo mắt thiết kế: (1) có mất phí không → hero + biên lai trả lời
// ngay; (2) nếu phải trả thì mua bao nhiêu → gói credit + ước lượng mềm quy
// mô dùng; (3) còn nghi ngại gì trước khi bấm mua → mini-FAQ đúng 3 câu hay
// chặn quyết định mua (không nhét cả /faq vào đây, chỉ phần liên quan tiền).
const PRE_PURCHASE_QUESTION_IDS = ['video-dai', 'gioi-han-ngay', 'hoan-tien'];

export default function PricingContent() {
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

    // Mua credit yêu cầu đăng nhập (đúng luồng của /billing) — chưa đăng nhập
    // thì qua /join trước, continueUrl đưa thẳng về /billing sau khi vào.
    const goToBilling = () => {
        if (AuthUtils.isAuthenticated()) {
            router.push('/billing');
        } else {
            router.push(`/join?continueUrl=${encodeURIComponent('/billing')}`);
        }
    };

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                <div className="mb-10">
                    <h1 className="text-[clamp(24px,3vw,30px)] font-bold tracking-[-0.015em] text-ink-text leading-tight">
                        Học miễn phí. Trả tiền chỉ khi muốn AI làm giúp bạn.
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        Tạo Space, chia chương, làm quiz, xem tiến độ, chia sẻ hay sao chép Space — không giới hạn, không mất phí. Chỉ khi bạn muốn AI tự soạn quiz hoặc tóm tắt theo cách riêng của mình, mới có chỗ cần trả.
                    </p>
                </div>

                {/* Biên lai — hình ảnh duy nhất "đáng nhớ" của trang này. Ẩn dụ
                    hoá đúng thứ trang này thật sự nói (1 lần AI tạo giúp tốn
                    bao nhiêu, theo đường nào) thay vì 2 card song song generic.
                    Xoay nhẹ + viền trên nét đứt = tờ giấy vừa xé, đặt trên bàn. */}
                <div className="flex justify-center mb-10">
                    <div
                        className="w-full max-w-[340px] bg-ink-panel border border-ink-border shadow-ink-md px-6 pt-5 pb-6 font-mono text-[13px] text-ink-text"
                        style={{ transform: 'rotate(-1.2deg)', borderTopWidth: 2, borderTopStyle: 'dashed' }}
                    >
                        <p className="text-center text-[11px] tracking-wide text-ink-textMuted mb-0.5">E-LEARNING PLATFORM</p>
                        <p className="text-center text-[11px] text-ink-textDim mb-4">1 lần AI tạo giúp (quiz / tóm tắt tuỳ biến)</p>

                        <div className="flex items-baseline justify-between gap-3 py-1.5 border-t border-dashed border-ink-border">
                            <span className="text-ink-textMid">dùng key riêng (BYOK)</span>
                            <span className="font-semibold text-ink-text">$0.00</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 py-1.5 border-t border-dashed border-ink-border">
                            <span className="text-ink-textMid">trả bằng credit</span>
                            <span className="font-semibold text-ink-text">− vài credit</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 py-1.5 border-t border-b border-dashed border-ink-border mb-3">
                            <span className="text-ink-textMid">mặc định, không tuỳ biến</span>
                            <span className="font-semibold text-ink-accent">miễn phí</span>
                        </div>
                        <p className="text-[11px] text-ink-textDim leading-relaxed">
                            dùng chung cho mọi người — không ai trả 2 lần cho cùng một nội dung.
                        </p>
                    </div>
                </div>

                <div className="space-y-3 mb-10 text-sm text-ink-textMid leading-relaxed">
                    <p>
                        <strong className="text-ink-text">Key riêng:</strong> dán API key (OpenAI, Gemini, Anthropic, Groq, OpenRouter, DeepSeek hoặc tương thích khác) ngay lúc soạn bài. Không giới hạn, key không được lưu lại — mỗi lần dùng bạn nhập lại.
                    </p>
                    <p>
                        <strong className="text-ink-text">Trả bằng credit:</strong> không muốn quản lý API key riêng thì mua credit, nền tảng tạo giúp — trừ một lượng nhỏ credit mỗi lần.
                    </p>
                </div>

                {/* Gói credit — số liệu lấy trực tiếp từ CREDIT_PACKAGE_OPTIONS,
                    cùng nguồn với /billing, không chép tay để tránh lệch giá. */}
                <section className="border border-ink-border rounded-ink-md overflow-hidden mb-2">
                    {CREDIT_PACKAGE_OPTIONS.map((pkg, i) => (
                        <div
                            key={pkg.id}
                            className={`flex items-stretch ${i < CREDIT_PACKAGE_OPTIONS.length - 1 ? 'border-b border-ink-border' : ''}`}
                        >
                            <span
                                style={{ width: 72 }}
                                className="shrink-0 flex items-center justify-center font-mono text-sm font-semibold text-ink-accent"
                            >
                                ${(pkg.priceUsdCents / 100).toFixed(2)}
                            </span>
                            <div className="flex-1 min-w-0 border-l border-ink-marginLn py-4 pl-4 pr-5 flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-ink-text">{pkg.credits} credit</p>
                            </div>
                        </div>
                    ))}
                    <div className="p-4 flex justify-end bg-ink-panel">
                        <Button
                            onClick={goToBilling}
                            className="bg-ink-accent hover:bg-ink-accent/90 text-white font-medium px-5 py-2.5 h-auto text-sm rounded-ink-md transition-all"
                        >
                            Mua credit
                        </Button>
                    </div>
                </section>
                {/* Ước lượng mềm — không cam kết số cứng (đã cố tình bỏ ở /pricing
                    từ đầu, xem comment src/content/faq.ts), nhưng "không nêu gì
                    cả" khiến người mua không hình dung được gói nhỏ nhất dùng
                    được bao lâu. Câu này chỉ nói tương đối, đủ để ra quyết định. */}
                <p className="text-xs text-ink-textDim leading-relaxed mb-10">
                    Gói nhỏ nhất thường đủ cho vài chục lượt AI tạo tuỳ biến — tuỳ độ dài nội dung mỗi lần.
                </p>

                {/* Trước-khi-mua — đúng 3 câu hay chặn quyết định bấm "Mua credit"
                    (video dài, giới hạn ngày, hoàn tiền), lấy từ src/content/faq.ts
                    để không lệch với /faq và chatbot. Đặt SAU gói giá vì đây là
                    câu hỏi nảy sinh khi người đọc đã định mua, không phải trước đó. */}
                <section className="mb-10">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-ink-textMuted mb-3">
                        Trước khi mua
                    </h2>
                    <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                        {PRE_PURCHASE_QUESTION_IDS.map((id, i) => {
                            const q = ALL_QUESTIONS[id];
                            if (!q) return null;
                            return (
                                <details
                                    key={id}
                                    className={`group ${i < PRE_PURCHASE_QUESTION_IDS.length - 1 ? 'border-b border-ink-border' : ''}`}
                                >
                                    <summary className="vd-focusable list-none cursor-pointer select-none px-5 py-3.5 flex items-center justify-between gap-3 text-sm font-medium text-ink-text hover:bg-ink-page transition-colors">
                                        {q.label}
                                        <span className="shrink-0 text-ink-textDim transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                                    </summary>
                                    <p className="px-5 pb-4 text-sm text-ink-textMid leading-relaxed whitespace-pre-line">
                                        {q.answer}
                                    </p>
                                </details>
                            );
                        })}
                    </div>
                    <a href="/faq" className="inline-block mt-3 text-xs font-medium text-ink-accent hover:underline">
                        Xem tất cả câu hỏi →
                    </a>
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-4 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>

            <SalesAgentWidget context="pricing" userName={user?.fullName} />
        </div>
    );
}
