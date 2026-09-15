'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronRight, ShieldCheck, Undo2, Zap } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { CREDIT_PACKAGE_OPTIONS, createCheckoutSession } from '@/lib/billing';
import { ALL_QUESTIONS } from '@/content/faq';

// Trang pricing v3 (2026-09-15) — mục tiêu duy nhất: rút ngắn đường tới lúc
// trả tiền. Ba quyết định:
//   1. Nút mua đi THẲNG sang Stripe Checkout (không qua /billing). Chưa đăng
//      nhập → /join rồi quay lại đây với ?buy=<gói>, tự mở checkout.
//   2. Gói giá đứng đầu, gọn trong 1 màn hình; gói lợi nhất là thẻ mực đậm
//      duy nhất giữa nền giấy (điểm nhấn duy nhất của trang).
//   3. Giá kèm quy đổi tiền Việt — "$1" đọc thành "khoảng 25.000đ".
// Giải thích 3 cách dùng AI và FAQ lùi xuống dưới cho người còn phân vân.
const PRE_PURCHASE_QUESTION_IDS = ['video-dai', 'gioi-han-ngay', 'hoan-tien'];

// Tỉ giá ước lượng để người đọc hình dung, không dùng để tính tiền (Stripe
// thu USD). Làm tròn nghìn, luôn kèm "≈".
const USD_TO_VND_APPROX = 25_000;
const formatVnd = (cents: number) => {
    const vnd = Math.round((cents / 100) * USD_TO_VND_APPROX / 1000) * 1000;
    return `≈ ${vnd.toLocaleString('vi-VN')}đ`;
};
const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;

const FREE_FEATURES = [
    'Tạo Space từ link YouTube',
    'Chia chương, sắp bài học',
    'Quiz, ghi chú, tiến độ',
    'Chia sẻ và sao chép Space',
    'Quiz và tóm tắt AI bản mặc định',
];

const AI_PATHS = [
    { name: 'Bản mặc định', need: 'Không cần gì. Kết quả dùng chung cho mọi người học cùng video.', cost: 'Miễn phí' },
    { name: 'Key AI của bạn', need: 'Dán API key (OpenAI, Gemini, Groq, OpenRouter…) lúc soạn. Key không được lưu.', cost: 'Miễn phí' },
    { name: 'Credit', need: 'Nền tảng gọi AI thay bạn. Cho người không muốn tự lo API key.', cost: null },
];

interface PricingContentProps {
    creditCostPerGeneration: number;
}

export default function PricingContent({ creditCostPerGeneration }: PricingContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const autoBuyStarted = useRef(false);

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

    const buy = async (packageId: string) => {
        if (!AuthUtils.isAuthenticated()) {
            router.push(`/join?continueUrl=${encodeURIComponent(`/pricing?buy=${packageId}`)}`);
            return;
        }
        setBusyPackageId(packageId);
        setError(null);
        try {
            window.location.href = await createCheckoutSession(packageId);
        } catch (err: any) {
            const code = err?.response?.data?.error;
            setError(
                code === 'STRIPE_NOT_CONFIGURED'
                    ? 'Mua credit chưa được bật trên nền tảng này.'
                    : 'Không mở được trang thanh toán, thử lại sau.',
            );
            setBusyPackageId(null);
        }
    };

    // Quay lại sau đăng nhập với ?buy=<gói> → mở checkout ngay, đúng gói đã bấm.
    useEffect(() => {
        const wanted = searchParams.get('buy');
        if (!wanted || autoBuyStarted.current) return;
        if (!AuthUtils.isAuthenticated()) return;
        if (!CREDIT_PACKAGE_OPTIONS.some((p) => p.id === wanted)) return;
        autoBuyStarted.current = true;
        buy(wanted);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const basePerCredit = CREDIT_PACKAGE_OPTIONS[0].priceUsdCents / CREDIT_PACKAGE_OPTIONS[0].credits;
    const packages = CREDIT_PACKAGE_OPTIONS.map((pkg) => ({
        ...pkg,
        generations: Math.floor(pkg.credits / creditCostPerGeneration),
        saving: Math.round((1 - pkg.priceUsdCents / pkg.credits / basePerCredit) * 100),
    }));

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
                {/* Một câu, không đoạn văn — người tới đây muốn thấy giá. */}
                <div className="text-center max-w-[36ch] mx-auto">
                    <h1 className="text-[clamp(26px,3.2vw,36px)] font-bold tracking-[-0.02em] leading-[1.15] text-ink-text">
                        Học miễn phí. AI soạn theo ý riêng từ {formatUsd(CREDIT_PACKAGE_OPTIONS[0].priceUsdCents)}.
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid">
                        Một credit là một lượt AI soạn quiz hoặc tóm tắt đúng theo yêu cầu của bạn.
                    </p>
                </div>

                {/* Ba gói. Gói lợi nhất là thẻ mực đậm duy nhất trên nền giấy. */}
                <ul className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                    {packages.map((pkg) => {
                        const hot = pkg.recommended === true;
                        return (
                            <li
                                key={pkg.id}
                                className={`relative flex flex-col rounded-ink-lg border p-5 sm:p-6 ${
                                    hot
                                        ? 'bg-ink-accent border-ink-accent text-white shadow-ink-md sm:-my-2 order-first sm:order-none'
                                        : 'bg-ink-panel border-ink-border text-ink-text shadow-ink-sm'
                                }`}
                            >
                                {hot && (
                                    <span className="absolute -top-3 left-5 text-[11px] font-semibold tracking-wide bg-ink-page text-ink-accent border border-ink-accent rounded-full px-2.5 py-0.5">
                                        Lợi nhất
                                    </span>
                                )}
                                <p className="flex items-baseline gap-2">
                                    <span className="font-mono text-[38px] leading-none font-semibold tabular-nums">{formatUsd(pkg.priceUsdCents)}</span>
                                    <span className={`text-[13px] ${hot ? 'text-white/75' : 'text-ink-textMuted'}`}>{formatVnd(pkg.priceUsdCents)}</span>
                                </p>
                                <p className="mt-3 text-[17px] font-semibold">
                                    {pkg.generations} lượt AI
                                </p>
                                <p className={`mt-1 text-[13px] ${hot ? 'text-white/80' : 'text-ink-textMid'}`}>
                                    {formatUsd(Math.round(pkg.priceUsdCents / pkg.generations))} mỗi lượt
                                    {pkg.saving > 0 && <span className={hot ? ' text-white' : ' text-ink-correct'}>, rẻ hơn {pkg.saving}%</span>}
                                </p>
                                <div className="flex-1" />
                                <Button
                                    size="lg"
                                    onClick={() => buy(pkg.id)}
                                    disabled={busyPackageId !== null}
                                    className={`vd-focusable mt-6 w-full font-semibold ${
                                        hot
                                            ? 'bg-white text-ink-accent hover:bg-white/90'
                                            : 'bg-ink-accent text-white hover:bg-ink-accent/90'
                                    }`}
                                >
                                    {busyPackageId === pkg.id ? 'Đang mở thanh toán…' : `Mua ${pkg.credits} credit`}
                                </Button>
                            </li>
                        );
                    })}
                </ul>

                {error && (
                    <p role="alert" className="mt-4 text-center text-sm text-ink-warning">{error}</p>
                )}

                {/* Ba lý do bấm yên tâm — ngắn, có icon, không chấm giữa. */}
                <ul className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px] text-ink-textMid">
                    <li className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-ink-accent" />Thanh toán qua Stripe</li>
                    <li className="inline-flex items-center gap-1.5"><Zap size={15} className="text-ink-accent" />Credit vào tài khoản ngay</li>
                    <li className="inline-flex items-center gap-1.5"><Undo2 size={15} className="text-ink-accent" />AI lỗi thì hoàn credit tự động</li>
                </ul>

                {/* Miễn phí — một dải ngang, không phải khối to. */}
                <section className="mt-14 border-t border-ink-border pt-8">
                    <p className="text-[15px] font-semibold text-ink-text">Không cần credit cho những việc này</p>
                    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                        {FREE_FEATURES.map((f) => (
                            <li key={f} className="inline-flex items-center gap-1.5 text-[14px] text-ink-textMid">
                                <Check size={14} strokeWidth={2.5} className="text-ink-accent" />{f}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Khi nào tốn credit — cho người còn phân vân, đặt dưới. */}
                <section className="mt-12">
                    <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink-text">Ba cách để AI soạn theo ý riêng</h2>
                    <div className="mt-4 bg-ink-panel border border-ink-border rounded-ink-lg overflow-hidden divide-y divide-ink-border">
                        {AI_PATHS.map((p) => (
                            <div key={p.name} className="grid grid-cols-[1fr_auto] sm:grid-cols-[170px_1fr_auto] gap-x-5 gap-y-1 px-5 py-4 items-baseline">
                                <p className="text-[15px] font-semibold text-ink-text">{p.name}</p>
                                <p className="hidden sm:block text-[14px] text-ink-textMid">{p.need}</p>
                                <p className={`font-mono text-[15px] font-semibold whitespace-nowrap ${p.cost ? 'text-ink-accent' : 'text-ink-text'}`}>
                                    {p.cost ?? `${creditCostPerGeneration} credit`}
                                </p>
                                <p className="sm:hidden col-span-2 text-[13.5px] text-ink-textMid">{p.need}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Chỉ 3 câu, đều là thứ chặn quyết định mua → hiện thẳng, không
                    giấu trong accordion. Câu hỏi trái, trả lời phải, cùng bề rộng
                    với các phần trên. */}
                <section className="mt-12">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink-text">Thường hỏi trước khi mua</h2>
                        <a href="/faq" className="vd-focusable inline-flex items-center gap-1 text-sm font-medium text-ink-accent hover:underline whitespace-nowrap">
                            Tất cả câu hỏi
                            <ChevronRight size={14} />
                        </a>
                    </div>
                    <dl className="mt-4 border-t border-ink-border">
                        {PRE_PURCHASE_QUESTION_IDS.map((id) => {
                            const q = ALL_QUESTIONS[id];
                            if (!q) return null;
                            return (
                                <div key={id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1.5 py-5 border-b border-ink-border">
                                    <dt className="text-[15px] font-semibold text-ink-text leading-snug">
                                        <a href={`/faq#${id}`} className="vd-focusable hover:text-ink-accent">{q.label}</a>
                                    </dt>
                                    <dd className="text-[14.5px] text-ink-textMid leading-relaxed whitespace-pre-line">{q.answer}</dd>
                                </div>
                            );
                        })}
                    </dl>
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>

            <SalesAgentWidget context="pricing" userName={user?.fullName} />
        </div>
    );
}
