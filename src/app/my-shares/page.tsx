'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    listMyShareLinks,
    revokeShareLink,
    getOrCreateShareLink,
    archiveSpace,
    unarchiveSpace,
    MyShareLink,
    listMySharedAIGenerations,
    revokeAIGenerationShare,
    MySharedAIGeneration,
} from '@/lib/management';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type ShareTab = 'space' | 'ai';

// WP1.5.11 + 2026-09-05 — "Chia sẻ của tôi": trước đây 2 trang RIÊNG cho 2
// domain chia sẻ khác nhau (/my-shares cho link Space, /my-ai-shares cho bản
// AI/quiz share bằng BYOK) — cùng chủ đề "chia sẻ" nhưng không biết nhau tồn
// tại, mỗi trang tự chèn 1 link chữ trỏ sang trang kia. Gộp về đúng 1 trang,
// 2 domain tách bằng tab (?tab=space|ai) thay vì 2 URL rời — /my-ai-shares cũ
// giờ chỉ còn là redirect (xem file đó) để không vỡ bookmark/link cũ.
export default function MySharesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<ShareTab>(searchParams.get('tab') === 'ai' ? 'ai' : 'space');
    const [user, setUser] = useState<User | null>(null);

    // ── Domain 1: link chia sẻ cấp Space ──
    const [links, setLinks] = useState<MyShareLink[]>([]);
    const [spaceState, setSpaceState] = useState<'loading' | 'idle' | 'error'>('loading');
    const [spaceError, setSpaceError] = useState<string | null>(null);
    const [busySpaceId, setBusySpaceId] = useState<number | null>(null);
    const [archivingId, setArchivingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // ── Domain 2: bản AI (quiz/tóm tắt) đã chia sẻ bằng BYOK ──
    const [aiItems, setAiItems] = useState<MySharedAIGeneration[]>([]);
    const [aiState, setAiState] = useState<'loading' | 'idle' | 'error'>('loading');
    const [aiError, setAiError] = useState<string | null>(null);
    const [busyAiId, setBusyAiId] = useState<string | null>(null);

    const loadSpaces = useCallback(async () => {
        setSpaceState('loading');
        try {
            const data = await listMyShareLinks();
            setLinks(data);
            setSpaceState('idle');
        } catch (error: any) {
            setSpaceError(error.message);
            setSpaceState('error');
        }
    }, []);

    const loadAi = useCallback(async () => {
        setAiState('loading');
        try {
            const data = await listMySharedAIGenerations();
            setAiItems(data);
            setAiState('idle');
        } catch (error: any) {
            setAiError(error.message);
            setAiState('error');
        }
    }, []);

    useEffect(() => {
        if (AuthUtils.isAuthenticated()) {
            setUser(AuthUtils.getCurrentUser());
        }
        // Tải cả 2 domain ngay từ đầu (không đợi chuyển tab) — số lượng mỗi
        // domain hiện ngay trên nhãn tab, không phải bấm vào mới biết trống/đầy.
        loadSpaces();
        loadAi();
    }, [loadSpaces, loadAi]);

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

    // Space handlers
    const handleCreate = async (spaceId: number) => {
        setBusySpaceId(spaceId);
        try {
            await getOrCreateShareLink(spaceId);
            await loadSpaces();
        } catch (error: any) {
            setSpaceError(error.message);
        } finally {
            setBusySpaceId(null);
        }
    };

    const handleRevoke = async (spaceId: number) => {
        if (!window.confirm('Thu hồi link này? Ai đang giữ link cũ sẽ không truy cập được nữa.')) return;
        setBusySpaceId(spaceId);
        try {
            await revokeShareLink(spaceId);
            await loadSpaces();
        } catch (error: any) {
            setSpaceError(error.message);
        } finally {
            setBusySpaceId(null);
        }
    };

    const handleToggleArchive = async (link: MyShareLink) => {
        const isActive = (link.status || '').toUpperCase() === 'ACTIVE';
        setArchivingId(link.id);
        try {
            if (isActive) {
                await archiveSpace(link.id);
            } else {
                await unarchiveSpace(link.id);
            }
            await loadSpaces();
        } catch (error: any) {
            setSpaceError(error.message);
        } finally {
            setArchivingId(null);
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

    // AI handlers
    const handleRevokeAi = async (item: MySharedAIGeneration) => {
        if (!window.confirm('Thu hồi chia sẻ bản này? Người khác sẽ không ăn cache được nữa — lần tuỳ biến kế tiếp trùng recipe này sẽ phải tự tạo lại (BYOK hoặc trả phí).')) return;
        setBusyAiId(item.id);
        try {
            await revokeAIGenerationShare(item.id);
            await loadAi();
        } catch (error: any) {
            setAiError(error.message);
        } finally {
            setBusyAiId(null);
        }
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <div className="mb-6">
                    <h1 className="text-[clamp(20px,2.2vw,26px)] font-bold tracking-[-0.015em] text-ink-text mb-1">Chia sẻ của tôi</h1>
                    <p className="text-sm text-ink-textMuted">
                        Quản lý mọi thứ bạn đã chia sẻ tại một chỗ — link xem trước Space, và bản AI (quiz/tóm tắt) dùng lại miễn phí bằng key riêng.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ShareTab)} className="mb-6">
                    <TabsList>
                        <TabsTrigger value="space">
                            Space{spaceState === 'idle' && links.length > 0 ? ` (${links.length})` : ''}
                        </TabsTrigger>
                        <TabsTrigger value="ai">
                            AI — Quiz/Tóm tắt{aiState === 'idle' && aiItems.length > 0 ? ` (${aiItems.length})` : ''}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {activeTab === 'space' ? (
                    <>
                        {spaceState === 'loading' && (
                            <div className="space-y-3">
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                            </div>
                        )}

                        {spaceState === 'error' && (
                            <Card className="border-destructive/30 bg-destructive/10">
                                <CardContent className="pt-6 text-sm text-destructive">{spaceError}</CardContent>
                            </Card>
                        )}

                        {spaceState === 'idle' && links.length === 0 && (
                            <Card>
                                <CardContent className="pt-6 text-sm text-ink-textMuted text-center">
                                    Bạn chưa có Space nào để chia sẻ.
                                </CardContent>
                            </Card>
                        )}

                        {spaceState === 'idle' && links.length > 0 && (
                            // "Giá sách" liên tục từ vibe-demo/spaces — panel duy nhất, cột
                            // lề trái đánh số, đường kẻ mực xanh dọc liên tục.
                            <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                                {links.map((link, i) => (
                                    <div key={link.id} className={`flex items-stretch ${i < links.length - 1 ? 'border-b border-ink-border' : ''}`}>
                                        <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div className="flex-1 min-w-0 border-l border-ink-marginLn py-3.5 px-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-ink-text truncate">{link.title}</p>
                                                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                        (link.status || '').toUpperCase() === 'ACTIVE'
                                                            ? 'bg-ink-successA text-ink-success border-ink-successBorder'
                                                            : 'bg-ink-warningA text-ink-warning border-ink-warningBorder'
                                                    }`}>
                                                        {(link.status || '').toUpperCase() === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}
                                                    </span>
                                                </div>
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
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="vd-focusable"
                                                    disabled={archivingId === link.id}
                                                    onClick={() => handleToggleArchive(link)}
                                                >
                                                    {archivingId === link.id ? '...' : (link.status || '').toUpperCase() === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {aiState === 'loading' && (
                            <div className="space-y-3">
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                                <Skeleton className="h-20 rounded-ink-md bg-ink-page" />
                            </div>
                        )}

                        {aiState === 'error' && (
                            <Card className="border-destructive/30 bg-destructive/10">
                                <CardContent className="pt-6 text-sm text-destructive">{aiError}</CardContent>
                            </Card>
                        )}

                        {aiState === 'idle' && aiItems.length === 0 && (
                            <Card>
                                <CardContent className="pt-6 text-sm text-ink-textMuted text-center">
                                    Bạn chưa chia sẻ bản AI nào. Tick &quot;Chia sẻ bản này cho người khác dùng miễn phí&quot; khi tuỳ biến bằng key riêng để bắt đầu.
                                </CardContent>
                            </Card>
                        )}

                        {aiState === 'idle' && aiItems.length > 0 && (
                            <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                                {aiItems.map((item, i) => (
                                    <div key={item.id} className={`flex items-stretch ${i < aiItems.length - 1 ? 'border-b border-ink-border' : ''}`}>
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
                                                    disabled={busyAiId === item.id}
                                                    onClick={() => handleRevokeAi(item)}
                                                >
                                                    Thu hồi chia sẻ
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
