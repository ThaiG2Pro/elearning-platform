'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { MARGIN_W } from '@/lib/vibe/theme';
import { getCreditBalance, createCheckoutSession, CREDIT_PACKAGE_OPTIONS } from '@/lib/billing';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

/**
 * WP4.1 (Checkpoint 4) — mua gói credit để dùng nhánh "Trả phí để nền tảng
 * tạo giúp" (nửa thứ 2 của nhánh UX #4, khi không có BYOK). Redirect thẳng
 * sang Stripe Checkout hosted — không tự render form thẻ ở đây.
 */
export default function BillingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadBalance = useCallback(async () => {
        try {
            const creditBalance = await getCreditBalance();
            setBalance(creditBalance);
        } catch {
            setError('Không tải được số dư credit. Thử tải lại trang.');
        }
    }, []);

    useEffect(() => {
        if (!AuthUtils.isAuthenticated()) {
            router.push(`/join?continueUrl=${encodeURIComponent('/billing')}`);
            return;
        }
        setUser(AuthUtils.getCurrentUser());
        loadBalance();
    }, [loadBalance, router]);

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

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} />

            <main className="max-w-3xl mx-auto px-4 py-7 md:py-10">
                {/* ADAPT theo ngữ pháp "trang vở kẻ lề" — số liệu nằm trong lề
                    mono (giống khối thông số bài thi ở vibe-demo/quiz renderIntro),
                    danh sách gói là các dòng liên tục thay lưới Card rời.
                    Logic Stripe checkout giữ nguyên 100%. */}
                <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Credit</h1>
                <p className="text-sm text-ink-textMuted mb-6">
                    Dùng credit để nền tảng tạo tóm tắt/quiz tuỳ biến giúp bạn khi bạn chưa muốn
                    nhập API key riêng (BYOK). Core học tập + AI mặc định miễn phí không cần credit.
                </p>

                {checkoutStatus === 'success' && (
                    <div className="vd-ink-in mb-4 text-sm text-ink-textMid bg-ink-page border border-ink-border rounded-lg p-3">
                        Thanh toán thành công — số dư credit đã được cập nhật.
                    </div>
                )}
                {checkoutStatus === 'cancelled' && (
                    <div className="mb-4 text-sm text-ink-textMuted bg-ink-page border border-ink-border rounded-lg p-3">
                        Đã huỷ thanh toán — chưa trừ tiền.
                    </div>
                )}

                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    {/* Số dư — con số trong lề, đúng ngữ pháp trang vở */}
                    <div className="flex items-stretch border-b border-ink-border">
                        <span style={{ width: MARGIN_W }} className="shrink-0 flex items-center justify-center font-mono text-[13px] font-semibold text-ink-accent">
                            {balance === null ? '…' : balance}
                        </span>
                        <div className="flex-1 border-l border-ink-marginLn py-3.5 pl-4 pr-5">
                            <p className="text-sm font-medium text-ink-text">Số dư hiện tại</p>
                            <p className="text-xs text-ink-textMuted mt-0.5">credit khả dụng cho các lần tạo AI tuỳ biến</p>
                        </div>
                    </div>

                    {CREDIT_PACKAGE_OPTIONS.map((pkg, i) => (
                        <div key={pkg.id} className={`flex items-stretch ${i < CREDIT_PACKAGE_OPTIONS.length - 1 ? 'border-b border-ink-border' : ''}`}>
                            <span style={{ width: MARGIN_W }} className="shrink-0 flex items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 min-w-0 border-l border-ink-marginLn py-3 pl-4 pr-5 flex items-center gap-3 justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink-text">{pkg.credits} credit</p>
                                    <p className="font-mono text-[11px] text-ink-textMuted mt-0.5">${(pkg.priceUsdCents / 100).toFixed(2)}</p>
                                </div>
                                <Button
                                    size="sm"
                                    className="vd-focusable shrink-0"
                                    disabled={busyPackageId !== null}
                                    onClick={() => handleBuy(pkg.id)}
                                >
                                    {busyPackageId === pkg.id ? 'Đang chuyển hướng…' : 'Mua'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        {error}
                    </div>
                )}
            </main>
        </div>
    );
}
