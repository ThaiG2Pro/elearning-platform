'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getMyLearningSpaces } from '@/lib/space';
import { Skeleton } from '@/components/ui/skeleton';
// WP1.5.8: this was the last hand-rolled tab strip in the app — every other
// page's filter/status tabs already use the shared Tabs component.
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyLearningSpace } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

export default function MyLearningPage() {
    const router = useRouter();

    const [spaces, setSpaces] = useState<MyLearningSpace[]>([]);
    const [filter, setFilter] = useState<'not_started' | 'in_progress' | 'completed' | undefined>(undefined);
    const [appState, setAppState] = useState<'idle' | 'loading' | 'no_results' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const loadSpaces = useCallback(async () => {
        setAppState('loading');
        setErrorMessage(null);

        try {
            const response = await getMyLearningSpaces(filter);
            setSpaces(response.spaces);

            if (response.spaces.length === 0) {
                setAppState('no_results');
            } else {
                setAppState('idle');
            }
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi tải danh sách Space.');
        }
    }, [filter]);

    const loadUser = useCallback(() => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    }, []);

    useEffect(() => {
        loadSpaces();
        loadUser();
    }, [loadSpaces, loadUser]);

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
            router.push('/');
        } catch (error: any) {
            setUser(null);
            router.push('/');
        }
    };

    const handleJoin = () => {
        const currentUrl = window.location.pathname;
        router.push(`/join?continueUrl=${encodeURIComponent(currentUrl)}`);
    };

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter === 'all' ? undefined : (newFilter as 'not_started' | 'in_progress' | 'completed'));
    };

    const handleSpaceClick = (spaceId: string) => {
        // Navigate to learning page - SCR-LRN-01
        router.push(`/spaces/${spaceId}/learn`);
    };

    const handleRetry = () => {
        loadSpaces();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    // WP1.6.4 — for the "đã xem 3:20" readout on spaces that are in_progress
    // but still 0% (no lesson duration is persisted anywhere, so this only
    // works with the raw saved position, not a percentage).
    const formatWatchedTime = (seconds: number) => {
        const s = Math.max(0, Math.floor(seconds || 0));
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(secs)}`;
        }
        return `${minutes}:${pad(secs)}`;
    };

    const STATUS_LABEL: Record<MyLearningSpace['status'], string> = {
        not_started: 'Chưa bắt đầu',
        in_progress: 'Đang học',
        completed: 'Hoàn thành',
    };
    const STATUS_BADGE_CLASS: Record<MyLearningSpace['status'], string> = {
        not_started: 'bg-ink-page text-ink-textMid border border-ink-border',
        in_progress: 'bg-ink-page text-ink-textMid border border-ink-border',
        completed: 'bg-ink-page text-ink-textMid border border-ink-border',
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* py-7 md:py-10 — cùng nhịp khoảng cách homepage/space-detail/about;
                max-w-7xl giữ nguyên (lưới thumbnail nhiều cột cần rộng, khác cột
                đơn 900px của vibe-demo/spaces — xem lý do không port "giá sách"
                màu gáy ở phần Tabs bên dưới). */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <div className="mb-6">
                    <h1 className="text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.015em] text-ink-text mb-1">
                        Space của tôi
                    </h1>
                    {/* Porting logic từ vibe-demo/spaces (đếm số không gian ngay dưới h1). */}
                    <p className="text-sm text-ink-textMuted">
                        {appState === 'idle' && spaces.length > 0 ? `${spaces.length} Space — ` : ''}Tiếp tục hành trình học tập của bạn
                    </p>
                </div>

                {/* Section 01: Bộ lọc */}
                <div className="mb-6">
                    <Tabs value={filter ?? 'all'} onValueChange={handleFilterChange}>
                        <TabsList>
                            <TabsTrigger value="in_progress">Đang học</TabsTrigger>
                            <TabsTrigger value="not_started">Chưa bắt đầu</TabsTrigger>
                            <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                            <TabsTrigger value="all">Tất cả</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Section 02: Danh sách Space — "giá sách" THẬT từ vibe-demo/spaces
                    (renderRow): danh sách dạng dòng với cột lề trái đánh số, thay lưới
                    card cũ. KHÔNG dùng "gáy sách" màu trừu tượng của demo — space thật
                    có thumbnail ảnh do người dùng upload, giàu thông tin hơn một khối
                    màu, nên giữ thumbnail thật ở đúng vị trí gáy sách (ảnh nhỏ 16:9 thay
                    vạch màu). Badge trạng thái + progress bar giữ nguyên logic cũ. */}
                <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                    {appState === 'loading' && (
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className={`flex items-stretch p-4 gap-4 ${index < 4 ? 'border-b border-ink-border' : ''}`}>
                                <Skeleton className="w-24 aspect-video rounded-ink-sm bg-ink-page shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <Skeleton className="h-4 w-1/2 bg-ink-page" />
                                    <Skeleton className="h-3 w-1/3 bg-ink-page" />
                                    <Skeleton className="h-2 w-full max-w-xs rounded-full mt-3 bg-ink-page" />
                                </div>
                            </div>
                        ))
                    )}

                    {appState === 'idle' && spaces.map((space, i) => (
                        <div
                            key={space.id}
                            onClick={() => handleSpaceClick(space.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSpaceClick(space.id); }}
                            className={`vd-focusable flex items-stretch cursor-pointer transition-colors hover:bg-ink-page ${i < spaces.length - 1 ? 'border-b border-ink-border' : ''}`}
                        >
                            <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                {String(i + 1).padStart(2, '0')}
                            </span>

                            {/* Thumbnail thật — thay "gáy sách" màu của vibe-demo */}
                            <div className="w-28 sm:w-32 aspect-video bg-ink-page shrink-0 my-3 ml-3 sm:ml-0 rounded-ink-sm overflow-hidden relative border border-ink-border">
                                {space.thumbnailUrl ? (
                                    <Image
                                        src={space.thumbnailUrl}
                                        alt={space.title}
                                        fill
                                        sizes="140px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-ink-textDim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 py-3.5 px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 title={space.title} className="text-sm font-semibold text-ink-text leading-snug truncate">
                                        {space.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="font-mono text-[11px] text-ink-textDim">{space.lessonCount} bài</span>
                                        <span className="font-mono text-[11px] text-ink-textDim">{formatDate(space.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Progress — WP1.6.4: a space with very few lessons (e.g. a
                                    single video) can only ever show completionRate 0 or 100, so
                                    a 0% bar while the user is 70% through that one video reads as
                                    untouched. When we have no finished lesson yet but do have a
                                    saved video position, show "đã xem 3:20" instead of a flat 0%
                                    bar — there's no persisted lesson duration to turn that into a
                                    real percentage. */}
                                <div className="flex items-center gap-2.5 shrink-0 sm:w-[180px]">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${STATUS_BADGE_CLASS[space.status]}`}>
                                        {STATUS_LABEL[space.status]}
                                    </span>
                                    {space.status !== 'not_started' && (
                                        space.completionRate > 0 ? (
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                <div className="flex-1 h-1 bg-ink-page rounded-full overflow-hidden">
                                                    <div className="h-full bg-ink-accent rounded-full" style={{ width: `${space.completionRate}%` }} />
                                                </div>
                                                <span className="font-mono text-[11px] font-semibold text-ink-accent shrink-0">{space.completionRate}%</span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-ink-accent font-medium truncate">
                                                Đã xem {formatWatchedTime(space.lastWatchedPositionSec || 0)}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {appState === 'no_results' && (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-ink-page flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-ink-textMid mb-1">
                                Chưa có Space
                            </h3>
                            <p className="text-sm text-ink-textMuted mb-4">
                                Bạn chưa có Space nào trong mục này.
                            </p>
                            <Button onClick={() => router.push('/')}>
                                Khám phá Space
                            </Button>
                        </div>
                    )}

                    {appState === 'error' && (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-ink-textMid mb-1">
                                Có lỗi xảy ra
                            </h3>
                            <p className="text-sm text-ink-textMuted mb-4">
                                {errorMessage}
                            </p>
                            <Button onClick={handleRetry}>
                                Thử lại
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
