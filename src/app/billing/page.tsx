'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} />

            <main className="max-w-3xl mx-auto px-4 py-8">
                <h1 className="text-xl font-semibold text-slate-800 mb-1">Credit</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Dùng credit để nền tảng tạo tóm tắt/quiz tuỳ biến giúp bạn khi bạn chưa muốn
                    nhập API key riêng (BYOK). Core học tập + AI mặc định miễn phí không cần credit.
                </p>

                {checkoutStatus === 'success' && (
                    <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        Thanh toán thành công — số dư credit đã được cập nhật.
                    </div>
                )}
                {checkoutStatus === 'cancelled' && (
                    <div className="mb-4 text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-3">
                        Đã huỷ thanh toán — chưa trừ tiền.
                    </div>
                )}

                <Card className="mb-6">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">Số dư hiện tại</p>
                        <p className="text-2xl font-semibold text-slate-800">
                            {balance === null ? '…' : `${balance} credit`}
                        </p>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-3">
                    {CREDIT_PACKAGE_OPTIONS.map((pkg) => (
                        <Card key={pkg.id}>
                            <CardContent className="p-4 flex flex-col items-start gap-2">
                                <p className="text-sm font-semibold text-slate-800">{pkg.credits} credit</p>
                                <p className="text-xs text-slate-500">${(pkg.priceUsdCents / 100).toFixed(2)}</p>
                                <Button
                                    className="w-full mt-1"
                                    disabled={busyPackageId !== null}
                                    onClick={() => handleBuy(pkg.id)}
                                >
                                    {busyPackageId === pkg.id ? 'Đang chuyển hướng…' : 'Mua'}
                                </Button>
                            </CardContent>
                        </Card>
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
