'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyShareLinks, revokeShareLink, getOrCreateShareLink, MyShareLink } from '@/lib/management';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// WP1.5.11 — previously the only way to see a share link again was the
// orphaned /my-spaces/[id]/view page, and there was no way to revoke
// one at any layer. This is the single place to view/create/revoke every
// share link across all owned spaces.
export default function MySharesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [links, setLinks] = useState<MyShareLink[]>([]);
    const [appState, setAppState] = useState<'loading' | 'idle' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busySpaceId, setBusySpaceId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setAppState('loading');
        try {
            const data = await listMyShareLinks();
            setLinks(data);
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
        router.push(`/join?continueUrl=${encodeURIComponent('/my-shares')}`);
    };

    const handleCreate = async (spaceId: number) => {
        setBusySpaceId(spaceId);
        try {
            await getOrCreateShareLink(spaceId);
            await load();
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setBusySpaceId(null);
        }
    };

    const handleRevoke = async (spaceId: number) => {
        if (!window.confirm('Thu hồi link này? Ai đang giữ link cũ sẽ không truy cập được nữa.')) return;
        setBusySpaceId(spaceId);
        try {
            await revokeShareLink(spaceId);
            await load();
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setBusySpaceId(null);
        }
    };

    const handleCopy = async (link: MyShareLink) => {
        if (!link.shareUrl) return;
        try {
            await navigator.clipboard.writeText(link.shareUrl);
            setCopiedId(link.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            // Clipboard API can fail (permissions, non-secure context) — non-critical, no toast needed.
        }
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Link chia sẻ của tôi</h1>
                <p className="text-sm text-ink-textMuted mb-6">
                    {links.length > 0 ? `${links.length} Space — ` : ''}Xem lại, tạo mới hoặc thu hồi link chia sẻ cho từng Space bạn sở hữu.
                </p>

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

                {appState === 'idle' && links.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-sm text-ink-textMuted text-center">
                            Bạn chưa có Space nào để chia sẻ.
                        </CardContent>
                    </Card>
                )}

                {appState === 'idle' && links.length > 0 && (
                    // "Giá sách" liên tục từ vibe-demo/spaces (renderRow) — thay chồng
                    // Card rời từng dòng cũ: một khối panel duy nhất, cột lề trái đánh
                    // số, đường kẻ mực xanh dọc liên tục, chia dòng bằng border-b.
                    <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                        {links.map((link, i) => (
                            <div key={link.id} className={`flex items-stretch ${i < links.length - 1 ? 'border-b border-ink-border' : ''}`}>
                                <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 min-w-0 border-l border-ink-marginLn py-3.5 px-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink-text truncate">{link.title}</p>
                                        {link.shareUrl ? (
                                            <p className="text-xs text-ink-textMuted truncate mt-0.5">{link.shareUrl}</p>
                                        ) : (
                                            <p className="text-xs text-ink-textDim mt-0.5">Chưa có link chia sẻ</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {link.shareUrl ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="vd-focusable"
                                                    onClick={() => handleCopy(link)}
                                                >
                                                    {copiedId === link.id ? 'Đã chép!' : 'Sao chép'}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="vd-focusable"
                                                    disabled={busySpaceId === link.id}
                                                    onClick={() => handleRevoke(link.id)}
                                                >
                                                    Thu hồi
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="vd-focusable"
                                                disabled={busySpaceId === link.id}
                                                onClick={() => handleCreate(link.id)}
                                            >
                                                Tạo link
                                            </Button>
                                        )}
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
