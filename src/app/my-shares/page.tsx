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
// orphaned /my-courses/[id]/view page, and there was no way to revoke
// one at any layer. This is the single place to view/create/revoke every
// share link across all owned courses.
export default function MySharesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [links, setLinks] = useState<MyShareLink[]>([]);
    const [appState, setAppState] = useState<'loading' | 'idle' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [busyCourseId, setBusyCourseId] = useState<number | null>(null);
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

    const handleCreate = async (courseId: number) => {
        setBusyCourseId(courseId);
        try {
            await getOrCreateShareLink(courseId);
            await load();
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setBusyCourseId(null);
        }
    };

    const handleRevoke = async (courseId: number) => {
        if (!window.confirm('Thu hồi link này? Ai đang giữ link cũ sẽ không truy cập được nữa.')) return;
        setBusyCourseId(courseId);
        try {
            await revokeShareLink(courseId);
            await load();
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setBusyCourseId(null);
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
        <div className="min-h-screen bg-slate-50">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-xl font-bold text-slate-900 mb-1">Link chia sẻ của tôi</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Xem lại, tạo mới hoặc thu hồi link chia sẻ cho từng Space bạn sở hữu.
                </p>

                {appState === 'loading' && (
                    <div className="space-y-3">
                        <Skeleton className="h-20 rounded-xl bg-slate-200" />
                        <Skeleton className="h-20 rounded-xl bg-slate-200" />
                        <Skeleton className="h-20 rounded-xl bg-slate-200" />
                    </div>
                )}

                {appState === 'error' && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6 text-sm text-red-600">{errorMessage}</CardContent>
                    </Card>
                )}

                {appState === 'idle' && links.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-sm text-slate-500 text-center">
                            Bạn chưa có Space nào để chia sẻ.
                        </CardContent>
                    </Card>
                )}

                {appState === 'idle' && links.length > 0 && (
                    <div className="space-y-3">
                        {links.map(link => (
                            <Card key={link.id}>
                                <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{link.title}</p>
                                        {link.shareUrl ? (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{link.shareUrl}</p>
                                        ) : (
                                            <p className="text-xs text-slate-400 mt-0.5">Chưa có link chia sẻ</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {link.shareUrl ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopy(link)}
                                                >
                                                    {copiedId === link.id ? 'Đã chép!' : 'Sao chép'}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={busyCourseId === link.id}
                                                    onClick={() => handleRevoke(link.id)}
                                                >
                                                    Thu hồi
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                disabled={busyCourseId === link.id}
                                                onClick={() => handleCreate(link.id)}
                                            >
                                                Tạo link
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
