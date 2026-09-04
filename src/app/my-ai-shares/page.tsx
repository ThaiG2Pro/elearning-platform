'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listMySharedAIGenerations, revokeAIGenerationShare, MySharedAIGeneration } from '@/lib/management';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// 2026-09-05 — trang quản lý còn thiếu từ khi feature "share BYOK" ra mắt:
// tick checkbox "Chia sẻ bản này cho người khác dùng miễn phí" lúc generate
// AI (xem AILessonComposer.tsx) trước đây là điểm chạm DUY NHẤT — không có
// nơi nào xem lại đã share gì, hay thu hồi nếu đổi ý. Cùng pattern với
// /my-shares (share link cấp Space) nhưng domain dữ liệu khác hẳn
// (ai_generations.visibility, không phải spaces.share_token).
export default function MyAISharesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [items, setItems] = useState<MySharedAIGeneration[]>([]);
    const [appState, setAppState] = useState<'loading' | 'idle' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setAppState('loading');
        try {
            const data = await listMySharedAIGenerations();
            setItems(data);
            setAppState('idle');
        } catch (error: any) {
            setErrorMessage(error.message);
            setAppState('error');
        }
    }, []);

    useEffect(() => {
        if (AuthUtils.isAuthenticated()) {
            setUser(AuthUtils.getCurrentUser());
        }
        load();
    }, [load]);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
            router.push('/');
        }
    };

    const handleJoin = () => {
        router.push(`/join?continueUrl=${encodeURIComponent('/my-ai-shares')}`);
    };

    const handleRevoke = async (item: MySharedAIGeneration) => {
        if (!window.confirm('Thu hồi chia sẻ bản này? Người khác sẽ không ăn cache được nữa — lần tuỳ biến kế tiếp trùng recipe này sẽ phải tự tạo lại (BYOK hoặc trả phí).')) return;
        setBusyId(item.id);
        try {
            await revokeAIGenerationShare(item.id);
            await load();
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setBusyId(null);
        }
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">AI đã chia sẻ của tôi</h1>
                <p className="text-sm text-ink-textMuted mb-2">
                    {items.length > 0 ? `${items.length} bản — ` : ''}Các bản quiz/tóm tắt bạn tạo bằng key riêng (BYOK) và đã chọn chia sẻ cho người khác dùng lại miễn phí.
                </p>
                {/* 2026-09-05 — trang này quản lý bản AI/quiz share bằng BYOK, khác
                    hẳn /my-shares (link chia sẻ CẤP SPACE) — 2 trang trước đây không
                    biết nhau tồn tại dù cùng chủ đề "chia sẻ của tôi". */}
                <button
                    onClick={() => router.push('/my-shares')}
                    className="block text-xs font-medium text-ink-accent hover:text-ink-accent/80 underline underline-offset-2 mb-6"
                >
                    Đang tìm link chia sẻ Space? Xem tại đây →
                </button>

                {appState === 'loading' && (
                    <div className="space-y-3">
                        <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                        <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                        <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                    </div>
                )}

                {appState === 'error' && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6 text-sm text-red-600">{errorMessage}</CardContent>
                    </Card>
                )}

                {appState === 'idle' && items.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-sm text-ink-textMuted text-center">
                            Bạn chưa chia sẻ bản AI nào. Tick "Chia sẻ bản này cho người khác dùng miễn phí" khi tuỳ biến bằng key riêng để bắt đầu.
                        </CardContent>
                    </Card>
                )}

                {appState === 'idle' && items.length > 0 && (
                    // "Giá sách" liên tục — cùng motif với /my-shares.
                    <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                        {items.map((item, i) => (
                            <div key={item.id} className={`flex items-stretch ${i < items.length - 1 ? 'border-b border-ink-border' : ''}`}>
                                <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 min-w-0 border-l border-ink-marginLn py-3.5 px-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ink-accentA text-ink-accent uppercase tracking-wide">
                                                {item.recipeType === 'quiz' ? 'Quiz' : 'Tóm tắt'}
                                            </span>
                                            <p className="text-sm font-medium text-ink-text truncate">{item.sourceTitle || item.sourceUrl}</p>
                                        </div>
                                        <p className="text-xs text-ink-textMuted mt-0.5">
                                            Tạo lúc {formatDate(item.createdAt)} — đã được dùng lại{' '}
                                            <span className="font-semibold text-ink-text">{item.reuseCount}</span> lần
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="vd-focusable"
                                            disabled={busyId === item.id}
                                            onClick={() => handleRevoke(item)}
                                        >
                                            Thu hồi chia sẻ
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
