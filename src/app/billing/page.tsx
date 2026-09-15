'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
    getCreditSummary,
    createCheckoutSession,
    listCreditTransactions,
    CREDIT_PACKAGE_OPTIONS,
    CREDIT_REASON_LABELS,
    type CreditSummary,
    type CreditTransaction,
} from '@/lib/billing';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

/**
 * WP4.1 — mua gói credit → Stripe Checkout hosted (không tự render form thẻ).
 *
 * 2026-09-15 — thành trang QUẢN LÝ credit đúng nghĩa (audit "không thấy quản
 * lý credit nằm đâu"): số dư to rõ kèm quy đổi ra số lượt, lịch sử giao dịch
 * đọc từ sổ cái (mua / AI trừ / hoàn / thu hồi Stripe / điều chỉnh tay) để
 * người trả tiền tự đối soát được, rồi mới tới phần mua gói. Lối vào: mục
 * "Credit" trong menu tài khoản.
 */
const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const recipeLabel = (recipeType: string) => (recipeType === 'quiz' ? 'Quiz' : recipeType === 'summary' ? 'Tóm tắt' : recipeType);

export default function BillingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [summary, setSummary] = useState<CreditSummary | null>(null);
    const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [loadingMore, setLoadingMore] = useState(false);

    const loadSummary = useCallback(async () => {
        try {
            setSummary(await getCreditSummary());
        } catch {
            setError('Không tải được số dư credit. Thử tải lại trang.');
        }
    }, []);

    const loadHistory = useCallback(async () => {
        setHistoryState('loading');
        try {
            const page = await listCreditTransactions();
            setTransactions(page.items);
            setNextCursor(page.nextCursor);
            setHistoryState('ready');
        } catch {
            setHistoryState('error');
        }
    }, []);

    const loadMore = async () => {
        if (!nextCursor) return;
        setLoadingMore(true);
        try {
            const page = await listCreditTransactions(nextCursor);
            setTransactions((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch {
            setHistoryState('error');
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!AuthUtils.isAuthenticated()) {
            router.push(`/join?continueUrl=${encodeURIComponent('/billing')}`);
            return;
        }
        setUser(AuthUtils.getCurrentUser());
        loadSummary();
        loadHistory();
    }, [loadSummary, loadHistory, router]);

    const checkoutStatus = searchParams.get('checkout');

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
            router.push('/');
        }
    };

    const handleBuy = async (packageId: string) => {
        setBusyPackageId(packageId);
        setError(null);
        try {
            const checkoutUrl = await createCheckoutSession(packageId);
            window.location.href = checkoutUrl;
        } catch (err: any) {
            const code = err.response?.data?.error;
            if (code === 'STRIPE_NOT_CONFIGURED') {
                setError('Tính năng mua credit chưa được bật trên nền tảng này.');
            } else {
                setError('Không tạo được phiên thanh toán, thử lại sau.');
            }
            setBusyPackageId(null);
        }
    };

    const balance = summary?.creditBalance ?? null;
    const cost = summary?.creditCostPerGeneration ?? 1;
    const generationsLeft = balance !== null ? Math.max(0, Math.floor(balance / cost)) : null;

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-10">
                <h1 className="text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.015em] text-ink-text">Credit</h1>
                <p className="mt-1.5 text-[14.5px] text-ink-textMid leading-relaxed">
                    Credit chỉ dùng khi bạn muốn AI soạn quiz hoặc tóm tắt theo yêu cầu riêng mà không dùng API key của mình.
                    Học, tạo Space và AI bản mặc định luôn miễn phí.
                </p>

                {checkoutStatus === 'success' && (
                    <div className="vd-ink-in mt-5 text-sm text-ink-success bg-ink-successA border border-ink-successBorder rounded-ink-md p-3">
                        Thanh toán thành công. Số dư đã được cập nhật, dòng “Mua gói credit” nằm đầu lịch sử bên dưới.
                    </div>
                )}
                {checkoutStatus === 'cancelled' && (
                    <div className="mt-5 text-sm text-ink-textMuted bg-ink-panel border border-ink-border rounded-ink-md p-3">
                        Đã huỷ thanh toán, chưa trừ tiền.
                    </div>
                )}
                {error && (
                    <div className="mt-5 text-sm text-ink-warning bg-ink-warningA border border-ink-warningBorder rounded-ink-md p-3">
                        {error}
                    </div>
                )}

                {/* Số dư — "trang sổ": lề mực bên trái, con số to trong cột nội dung. */}
                <section className="relative mt-6 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden">
                    <div className="absolute inset-y-0 left-[44px] w-px bg-ink-marginLn" aria-hidden />
                    <div className="relative pl-[64px] pr-6 py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <p className="text-[13px] text-ink-textMuted">Số dư hiện tại</p>
                            <p className="mt-1 flex items-baseline gap-2">
                                <span className={`font-mono text-[40px] leading-none font-semibold tabular-nums ${balance !== null && balance < 0 ? 'text-ink-wrong' : 'text-ink-text'}`}>
                                    {balance === null ? '…' : balance}
                                </span>
                                <span className="text-[15px] text-ink-textMid">credit</span>
                            </p>
                            {generationsLeft !== null && (
                                <p className="mt-2 text-[13.5px] text-ink-textMid">
                                    {balance !== null && balance < 0
                                        ? 'Số dư âm do thu hồi sau hoàn tiền hoặc khiếu nại thẻ. Mua thêm để dùng tiếp.'
                                        : `Đủ cho ${generationsLeft} lượt AI soạn theo yêu cầu riêng, mỗi lượt trừ ${cost} credit.`}
                                </p>
                            )}
                        </div>
                        <Button asChild variant="ghost" className="vd-focusable self-start sm:self-auto text-ink-accent hover:text-ink-accent">
                            <a href="#mua-credit">Mua thêm</a>
                        </Button>
                    </div>
                </section>

                {/* Lịch sử — người trả tiền tự đối soát được. */}
                <section className="mt-10">
                    <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink-text">Lịch sử giao dịch</h2>
                    <div className="mt-3 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden">
                        {historyState === 'loading' && (
                            <p className="px-5 py-6 text-sm text-ink-textMuted">Đang tải…</p>
                        )}
                        {historyState === 'error' && (
                            <div className="px-5 py-6 text-sm text-ink-textMid flex items-center justify-between gap-3">
                                Không tải được lịch sử.
                                <Button size="sm" variant="outline" className="vd-focusable" onClick={loadHistory}>Thử lại</Button>
                            </div>
                        )}
                        {historyState === 'ready' && transactions.length === 0 && (
                            <p className="px-5 py-6 text-sm text-ink-textMid">
                                Chưa có giao dịch nào. Mua gói đầu tiên bên dưới, hoặc dùng AI bản mặc định miễn phí.
                            </p>
                        )}
                        {historyState === 'ready' && transactions.length > 0 && (
                            <ul className="divide-y divide-ink-border">
                                {transactions.map((t) => (
                                    <li key={t.id} className="px-5 py-3.5 flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14.5px] font-medium text-ink-text">{CREDIT_REASON_LABELS[t.reason] ?? t.reason}</p>
                                            <p className="mt-0.5 text-[12.5px] text-ink-textMid truncate">
                                                {t.generation
                                                    ? `${recipeLabel(t.generation.recipeType)}${t.generation.sourceTitle ? ` cho "${t.generation.sourceTitle}"` : ''}`
                                                    : t.note ?? ''}
                                                {(t.generation || t.note) && ' · '}
                                                <time dateTime={t.createdAt} className="font-mono text-[12px]">{formatDate(t.createdAt)}</time>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-mono text-[15px] font-semibold tabular-nums ${t.amount > 0 ? 'text-ink-correct' : 'text-ink-text'}`}>
                                                {t.amount > 0 ? '+' : ''}{t.amount}
                                            </p>
                                            <p className="font-mono text-[11.5px] text-ink-textDim tabular-nums">còn {t.balanceAfter}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {nextCursor && historyState === 'ready' && (
                        <Button variant="ghost" className="vd-focusable mt-3 text-ink-textMid" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? 'Đang tải…' : 'Xem thêm'}
                        </Button>
                    )}
                </section>

                {/* Mua gói — cùng bảng với /pricing, cùng nhãn "Lợi nhất". */}
                <section id="mua-credit" className="mt-10 scroll-mt-24">
                    <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink-text">Mua credit</h2>
                    <p className="mt-1 text-[13.5px] text-ink-textMid">Thanh toán qua Stripe, credit cộng vào tài khoản ngay khi thanh toán xong.</p>
                    <ul className="mt-3 bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden divide-y divide-ink-border">
                        {CREDIT_PACKAGE_OPTIONS.map((pkg) => (
                            <li key={pkg.id} className={`relative flex items-center gap-4 px-5 py-4 ${pkg.recommended ? 'bg-ink-accentA' : ''}`}>
                                {pkg.recommended && <span className="absolute inset-y-0 left-0 w-[3px] bg-ink-accent" aria-hidden />}
                                <span className="font-mono text-[20px] font-semibold text-ink-text tabular-nums w-[84px] shrink-0">
                                    ${(pkg.priceUsdCents / 100).toFixed(2)}
                                </span>
                                <span className="flex-1 min-w-0 text-[15px] font-medium text-ink-text">
                                    {pkg.credits} credit
                                    {pkg.recommended && (
                                        <span className="ml-2 inline-block align-middle text-[11px] font-semibold text-ink-accent border border-ink-accent/40 rounded px-1.5 py-px">
                                            Lợi nhất
                                        </span>
                                    )}
                                </span>
                                <Button
                                    size="sm"
                                    className="vd-focusable shrink-0 bg-ink-accent hover:bg-ink-accent/90 text-white"
                                    disabled={busyPackageId !== null}
                                    onClick={() => handleBuy(pkg.id)}
                                >
                                    {busyPackageId === pkg.id ? 'Đang chuyển…' : 'Mua'}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}
