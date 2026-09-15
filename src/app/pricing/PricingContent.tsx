'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { CREDIT_PACKAGE_OPTIONS } from '@/lib/billing';
import { ALL_QUESTIONS } from '@/content/faq';

// Bố cục theo thứ tự câu hỏi người đọc thật sự có: (1) có mất phí không →
// hero + danh sách miễn phí trả lời ngay; (2) khi nào phải trả → sổ cái 3
// cách dùng AI, cột chi phí là thứ mắt đọc trước; (3) trả thì bao nhiêu →
// gói credit kèm giá mỗi credit để so được; (4) còn nghi ngại gì → 3 câu FAQ
// hay chặn quyết định mua (không nhét cả /faq vào đây).
const PRE_PURCHASE_QUESTION_IDS = ['video-dai', 'gioi-han-ngay', 'hoan-tien'];

const FREE_FEATURES = [
    'Tạo Space từ link YouTube',
    'Chia chương, sắp thứ tự bài học',
    'Làm quiz và ghi chú theo bài',
    'Theo dõi tiến độ học',
    'Chia sẻ và sao chép Space',
    'Quiz, tóm tắt AI bản mặc định',
];

// Ba cách để AI soạn quiz / tóm tắt. Hai cách đầu miễn phí — đây là điều
// trang này cần nói rõ nhất, nên cột "chi phí" được nhấn mạnh hơn cột tên.
const AI_PATHS = [
    {
        name: 'Bản mặc định',
        need: 'Không cần gì. Kết quả dùng chung cho mọi người học cùng video, không ai trả hai lần cho một nội dung.',
        cost: 'Miễn phí' as string | null,
        paid: false,
    },
    {
        name: 'Key AI của bạn',
        need: 'Dán API key (OpenAI, Gemini, Anthropic, Groq, OpenRouter, DeepSeek…) lúc soạn bài. Key không được lưu, mỗi lần nhập lại.',
        cost: 'Miễn phí',
        paid: false,
    },
    {
        name: 'Trả bằng credit',
        need: 'Mua credit, nền tảng gọi AI thay bạn. Dành cho người không muốn tự quản lý API key.',
        cost: null,
        paid: true,
    },
];

const formatUsd = (cents: number) =>
    '$' + (cents / 100).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface PricingContentProps {
    /** Số credit trừ cho 1 lượt AI soạn theo yêu cầu riêng — page.tsx đọc từ server. */
    creditCostPerGeneration: number;
}

export default function PricingContent({ creditCostPerGeneration }: PricingContentProps) {
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

    const startFree = () => router.push(user ? '/' : '/join');

    // Số lượt và giá mỗi lượt tính từ dữ liệu gói + chi phí thật mỗi lượt,
    // không chép tay — đổi giá ở billing.ts hay đổi env là đây đổi theo.
    const basePerCredit = CREDIT_PACKAGE_OPTIONS[0].priceUsdCents / CREDIT_PACKAGE_OPTIONS[0].credits;
    const packages = CREDIT_PACKAGE_OPTIONS.map((pkg) => {
        const perCredit = pkg.priceUsdCents / pkg.credits;
        const saving = Math.round((1 - perCredit / basePerCredit) * 100);
        const generations = Math.floor(pkg.credits / creditCostPerGeneration);
        return { ...pkg, saving, generations, perGenerationCents: perCredit * creditCostPerGeneration };
    });

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                {/* (1) Có mất phí không — trả lời trong một câu, và danh sách
                    miễn phí đặt cạnh dạng "trang sổ" (lề mực + dải bookmark),
                    cùng motif với hero trang chủ. */}
                <section className="mb-14">
                    <div className="min-w-0">
                        <h1 className="text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em] leading-[1.15] text-ink-text max-w-[20ch]">
                            Học miễn phí. Chỉ trả khi muốn AI soạn theo ý riêng.
                        </h1>
                        <p className="mt-4 text-[15.5px] leading-[1.65] text-ink-textMid max-w-[52ch]">
                            Mọi việc học, tạo và chia sẻ Space đều không mất phí và không giới hạn. Chỗ duy nhất có thể tốn tiền là khi bạn muốn AI soạn quiz hoặc tóm tắt theo cách riêng mà không dùng API key của mình.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Button size="lg" className="vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white" onClick={startFree}>
                                {user ? 'Về trang chủ' : 'Bắt đầu miễn phí'}
                            </Button>
                            <Button size="lg" variant="ghost" className="vd-focusable text-ink-textMid hover:text-ink-text" asChild>
                                <a href="#goi-credit">Xem gói credit</a>
                            </Button>
                        </div>
                    </div>

                    <div className="relative mt-8 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden">
                        <div className="absolute inset-y-0 left-[44px] w-px bg-ink-marginLn" aria-hidden />
                        <div
                            className="absolute top-0 right-6 w-[30px] h-11 bg-ink-accent z-[2]"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                            aria-hidden
                        />
                        <div className="relative pl-[64px] pr-6 py-6">
                            <p className="text-[15px] font-semibold text-ink-text pr-10">Miễn phí, không giới hạn</p>
                            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                                {FREE_FEATURES.map((f) => (
                                    <li key={f} className="relative flex items-start gap-3 text-[14.5px] leading-6 text-ink-text">
                                        <span className="absolute -left-[64px] top-0 w-[44px] flex justify-center text-ink-accent leading-6">
                                            <Check size={15} className="mt-[5px]" strokeWidth={2.5} />
                                        </span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* (2) Khi nào phải trả — sổ cái ba cách dùng AI. Cột chi phí
                    đặt cuối, chữ to, để mắt đọc được "miễn phí, miễn phí, vài
                    credit" trước khi đọc chi tiết. */}
                <section className="mb-14">
                    <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink-text">Ba cách để AI soạn quiz và tóm tắt</h2>
                    <p className="mt-1.5 text-[14.5px] text-ink-textMid">Hai cách đầu không tốn gì. Cách thứ ba mới dùng đến credit.</p>

                    <div className="mt-6 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-left text-[12.5px] text-ink-textMuted border-b border-ink-border">
                                    <th scope="col" className="font-medium px-5 py-3 md:w-[26%]">Cách dùng</th>
                                    <th scope="col" className="font-medium px-5 py-3 hidden md:table-cell">Bạn cần gì</th>
                                    <th scope="col" className="font-medium px-5 py-3 text-right whitespace-nowrap">Chi phí mỗi lần</th>
                                </tr>
                            </thead>
                            <tbody>
                                {AI_PATHS.map((p, i) => (
                                    <tr key={p.name} className={i < AI_PATHS.length - 1 ? 'border-b border-ink-border' : ''}>
                                        <th scope="row" className="align-top text-left px-5 py-5 text-[15px] font-semibold text-ink-text">
                                            {p.name}
                                            <span className="block md:hidden mt-1.5 text-[13.5px] font-normal leading-relaxed text-ink-textMid">{p.need}</span>
                                        </th>
                                        <td className="align-top px-5 py-5 text-[14px] leading-relaxed text-ink-textMid hidden md:table-cell">{p.need}</td>
                                        <td className="align-top px-5 py-5 text-right whitespace-nowrap">
                                            <span className={`font-mono text-[17px] font-semibold ${p.paid ? 'text-ink-text' : 'text-ink-accent'}`}>
                                                {p.cost ?? `${creditCostPerGeneration} credit`}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* (3) Trả thì bao nhiêu — số liệu lấy từ CREDIT_PACKAGE_OPTIONS,
                    cùng nguồn với /billing. Giá mỗi credit và mức rẻ hơn là
                    thứ giúp chọn gói, gói to hơn không phải "nổi bật" tuỳ ý. */}
                <section id="goi-credit" className="mb-14 scroll-mt-24">
                    <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink-text">Gói credit</h2>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-textMid">
                        {creditCostPerGeneration === 1
                            ? 'Một credit là một lượt AI soạn theo yêu cầu riêng, không phụ thuộc độ dài video.'
                            : `Mỗi lượt AI soạn theo yêu cầu riêng trừ ${creditCostPerGeneration} credit, không phụ thuộc độ dài video.`}{' '}
                        Nếu AI gặp lỗi giữa chừng, credit của lượt đó được hoàn lại tự động.
                    </p>

                    <ul className="mt-6 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden divide-y divide-ink-border">
                        {packages.map((pkg) => (
                            <li
                                key={pkg.id}
                                className={`relative flex items-center gap-4 px-5 py-5 ${pkg.recommended ? 'bg-ink-accentA' : ''}`}
                            >
                                {pkg.recommended && <span className="absolute inset-y-0 left-0 w-[3px] bg-ink-accent" aria-hidden />}
                                <span className="font-mono text-[22px] font-semibold text-ink-text tabular-nums w-[92px] shrink-0">
                                    ${(pkg.priceUsdCents / 100).toFixed(2)}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] font-medium text-ink-text">
                                        {pkg.credits} credit
                                        {pkg.recommended && (
                                            <span className="ml-2 inline-block align-middle text-[11.5px] font-semibold text-ink-accent border border-ink-accent/40 rounded px-1.5 py-px">
                                                Lợi nhất
                                            </span>
                                        )}
                                    </span>
                                    {creditCostPerGeneration !== 1 && (
                                        <span className="block text-[13px] text-ink-textMid">{pkg.generations} lượt AI soạn</span>
                                    )}
                                </span>
                                <span className="text-right shrink-0">
                                    <span className="block font-mono text-[13px] text-ink-textMid tabular-nums">{formatUsd(pkg.perGenerationCents)} / lượt</span>
                                    {pkg.saving > 0 && (
                                        <span className="block mt-0.5 text-[12.5px] text-ink-correct">Rẻ hơn gói nhỏ {pkg.saving}%</span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-[13.5px] text-ink-textMid">Thanh toán qua Stripe, mua xong dùng được ngay.</p>
                        <Button size="lg" onClick={goToBilling} className="vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white">
                            Mua credit
                        </Button>
                    </div>
                </section>

                {/* (4) Trước khi mua — đúng 3 câu hay chặn quyết định bấm "Mua
                    credit", lấy từ src/content/faq.ts để không lệch với /faq. */}
                <section>
                    <h2 className="text-[22px] font-bold tracking-[-0.01em] text-ink-text mb-4">Thường hỏi trước khi mua</h2>
                    <div className="bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden">
                        {PRE_PURCHASE_QUESTION_IDS.map((id, i) => {
                            const q = ALL_QUESTIONS[id];
                            if (!q) return null;
                            return (
                                <details
                                    key={id}
                                    className={`group ${i < PRE_PURCHASE_QUESTION_IDS.length - 1 ? 'border-b border-ink-border' : ''}`}
                                >
                                    <summary className="vd-focusable list-none cursor-pointer select-none px-5 py-4 flex items-center justify-between gap-3 text-[15px] font-medium text-ink-text hover:bg-ink-page transition-colors">
                                        {q.label}
                                        <ChevronRight size={16} className="shrink-0 text-ink-textDim transition-transform group-open:rotate-90" />
                                    </summary>
                                    <p className="px-5 pb-5 text-[14.5px] text-ink-textMid leading-relaxed whitespace-pre-line">
                                        {q.answer}
                                    </p>
                                </details>
                            );
                        })}
                    </div>
                    <a href="/faq" className="vd-focusable inline-flex items-center gap-1 mt-4 text-sm font-medium text-ink-accent hover:underline">
                        Xem tất cả câu hỏi
                        <ChevronRight size={14} />
                    </a>
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-12 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>

            <SalesAgentWidget context="pricing" userName={user?.fullName} />
        </div>
    );
}
