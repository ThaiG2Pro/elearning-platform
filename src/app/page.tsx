'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import SpaceList from '@/components/SpaceList';
import { Button } from '@/components/ui/button';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { Space, MyLearningSpace } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { getSpaces } from '@/lib/spaces';
import { getMyLearningSpaces } from '@/lib/space';
import { createSpaceFromLink } from '@/lib/management';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';

type AppState = 'idle' | 'loading' | 'error' | 'success';
type ContinueState = 'idle' | 'loading' | 'loaded' | 'error';

export default function Home() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // "Học tiếp" (Continue learning) for returning users
    const [continueSpaces, setContinueSpaces] = useState<MyLearningSpace[]>([]);
    const [continueState, setContinueState] = useState<ContinueState>('idle');

    // Toggles for 2-tier Discovery sections
    const [showAllShowcase, setShowAllShowcase] = useState(false);
    const [showAllPopular, setShowAllPopular] = useState(false);

    // Paste-link box
    const [linkUrl, setLinkUrl] = useState('');
    const [creatingFromLink, setCreatingFromLink] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [createdSpace, setCreatedSpace] = useState<{ spaceId: string; title: string; titleIsPlaceholder: boolean } | null>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchSpaces = useCallback(async (query: string) => {
        try {
            setAppState('loading');
            setErrorMessage(null);
            const data = await getSpaces(query || undefined);
            setSpaces(data);
            setAppState('success');
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message);
            setSpaces([]);
        }
    }, []);

    // Effect for search changes
    useEffect(() => {
        fetchSpaces(debouncedSearchQuery);
    }, [debouncedSearchQuery, fetchSpaces]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    // Fetch "học tiếp" once we know user is logged in
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            setContinueState('loading');
            try {
                const response = await getMyLearningSpaces('in_progress');
                if (cancelled) return;
                setContinueSpaces(response.spaces);
                setContinueState('loaded');
            } catch {
                if (cancelled) return;
                setContinueState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const isPlaylistUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url)
        && /[?&]list=/.test(url)
        && !/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);

    const handleCreateFromLink = async () => {
        const url = linkUrl.trim();
        if (!url) return;
        if (isPlaylistUrl(url)) {
            setLinkError('Chưa hỗ trợ playlist — dán link từng video.');
            return;
        }
        setLinkError(null);
        setCreatingFromLink(true);
        try {
            const res = await createSpaceFromLink(url);
            setLinkUrl('');
            setCreatedSpace(res);
        } catch (err: any) {
            const message = err.message;
            if (message === 'UNAUTHORIZED') {
                setLinkError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            } else if (message === 'NETWORK_ERROR' || message === 'SERVER_ERROR') {
                setLinkError('Hệ thống không thể tạo Space lúc này, vui lòng thử lại.');
            } else {
                setLinkError(message || 'Lỗi khi tạo Space');
            }
        } finally {
            setCreatingFromLink(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
        } catch {
            setUser(null);
        }
    };

    const handleJoin = () => {
        router.push('/join');
    };

    const handleSpaceClick = (spaceId: number) => {
        router.push(`/spaces/${spaceId}`);
    };

    // Filter spaces for Tầng 1 (Showcase) and Tầng 2 (Lineage Popularity)
    const showcaseSpaces = spaces.filter((c) => c.isShowcase);
    const popularSpaces = [...spaces]
        .filter((c) => !c.isShowcase)
        .sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));

    // Fallback if no non-showcase spaces exist yet
    const displayPopularSpaces = popularSpaces.length > 0
        ? popularSpaces
        : [...spaces].sort((a, b) => (b.cloneCount || 0) - (a.cloneCount || 0));

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            {/* max-w-[1180px] + padding rhythm khớp cột nội dung của vibe-demo/home
                (trước là max-w-7xl/py-8 độc lập) — chỉ đổi container/spacing, KHÔNG
                đụng logic hiển thị bên trong. Không port lưới 1fr/320px + rail lịch-
                mực/streak của vibe-demo: đó là 1 feature (lịch streak) app thật chưa
                có model dữ liệu, bịa ra sẽ là thêm tính năng giả, ngoài phạm vi layout. */}
            <main className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                {/* Hero / Search Section */}
                <section className="mb-8 bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.015em] text-ink-text">Khám phá Space</h1>
                            <p className="text-sm text-ink-textMuted mt-1">Học bất cứ lúc nào — bắt đầu với Space phù hợp.</p>
                        </div>
                        <div className="w-full md:max-w-sm">
                            <SearchBar value={searchQuery} onChange={handleSearchChange} />
                        </div>
                    </div>
                </section>

                {/* Paste-link box for logged-in users */}
                {user && !createdSpace && (
                    <section className="mb-8 bg-ink-accent rounded-ink-md p-6 shadow-ink-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="md:flex-shrink-0">
                                <h2 className="text-lg font-bold text-white">Dán link video, tạo Space ngay</h2>
                                <p className="text-sm text-white/70 mt-0.5">Dán link YouTube — hệ thống tự lấy tiêu đề, ảnh và tạo bài học đầu tiên.</p>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2">
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFromLink(); }}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    disabled={creatingFromLink}
                                    className="flex-1 px-3 py-2.5 rounded-lg border-0 text-sm text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-60"
                                />
                                <Button
                                    onClick={handleCreateFromLink}
                                    disabled={creatingFromLink || !linkUrl.trim()}
                                    variant="secondary"
                                    className="vd-focusable whitespace-nowrap"
                                >
                                    {creatingFromLink ? 'Đang tạo…' : 'Tạo Space'}
                                </Button>
                            </div>
                        </div>
                        {linkError && (
                            <p className="mt-2 text-sm text-white/90 bg-black/15 rounded-lg px-3 py-2">{linkError}</p>
                        )}
                    </section>
                )}

                {/* Card choices after pasting URL */}
                {createdSpace && (
                    // vd-ink-in — "hạ mực": card vừa xuất hiện ngay sau khi tạo Space
                    // thành công (đồng bộ motif với my-spaces/page.tsx và quiz-result
                    // ở learn/page.tsx).
                    <section className="mb-8 bg-ink-panel border border-ink-correct/30 rounded-ink-md p-6 shadow-ink-sm vd-ink-in">
                        <p className="text-xs font-semibold text-ink-correct uppercase tracking-wide mb-1">Đã tạo Space</p>
                        <h2 className="text-lg font-bold text-ink-text">{createdSpace.title}</h2>
                        {createdSpace.titleIsPlaceholder && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                                Không đọc được tên video từ YouTube — đã đặt tên tạm, bạn có thể đổi trong phần chỉnh sửa.
                            </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <Button className="vd-focusable" onClick={() => router.push(`/spaces/${createdSpace.spaceId}/learn`)}>
                                Học ngay
                            </Button>
                            <Button variant="outline" onClick={() => router.push(`/my-spaces/${createdSpace.spaceId}/edit`)}>
                                Thêm quiz/tóm tắt trước khi học
                            </Button>
                            <Button variant="ghost" onClick={() => setCreatedSpace(null)}>
                                Dán link khác
                            </Button>
                        </div>
                    </section>
                )}

                {/* KHU VỰC 1 (Dành cho User đã Login): "Tiếp tục học" */}
                {/* Restyle theo "Mực xanh trên giấy trắng" (xem vibe-demo/home) — thẻ
                    bookmark-ribbon thay cho card trắng + progress bar cũ. Cấu trúc dữ
                    liệu/logic (grid nhiều Space, 3 trạng thái loading/loaded/rỗng) giữ
                    nguyên 100%; model MyLearningSpace không có lessonTitle/chapter meta
                    như mock nên phần "Đang học · {lessonTitle}" của mock được thay bằng
                    field thật sẵn có: title + lessonCount. */}
                {user && continueState !== 'idle' && continueState !== 'error' && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-ink-text">Tiếp tục học</h2>
                            <span className="text-xs font-medium text-ink-textDim">Dành riêng cho bạn</span>
                        </div>
                        {continueState === 'loading' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-ink-panel border border-ink-border rounded-ink-md animate-pulse" />
                                ))}
                            </div>
                        ) : continueSpaces.length > 0 ? (
                            <div>
                                {continueSpaces.map((space, i) => (
                                    <button
                                        key={space.id}
                                        onClick={() => router.push(`/spaces/${space.id}/learn`)}
                                        className={`relative flex w-full flex-col sm:flex-row text-left bg-ink-panel border border-ink-border rounded-ink-md overflow-hidden shadow-ink-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2 ${i > 0 ? 'mt-4' : ''}`}
                                    >
                                        {space.completionRate > 0 && (
                                            <div
                                                className="absolute top-0 right-7 w-[30px] h-11 bg-ink-accent flex items-start justify-center pt-2 z-[2]"
                                                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                                            >
                                                <span className="font-mono text-[9.5px] font-bold text-white">{space.completionRate}%</span>
                                            </div>
                                        )}

                                        <div className="relative flex items-center justify-center bg-ink-room shrink-0 w-full sm:w-[220px] aspect-video sm:aspect-auto">
                                            {space.thumbnailUrl && (
                                                <Image
                                                    src={space.thumbnailUrl}
                                                    alt=""
                                                    fill
                                                    sizes="220px"
                                                    className="object-cover opacity-60"
                                                />
                                            )}
                                            <div
                                                className="relative w-[52px] h-[52px] rounded-full border-[1.5px] border-ink-accentScreen flex items-center justify-center"
                                                style={{ background: 'rgba(244,246,252,0.12)' }}
                                            >
                                                <Play size={18} className="text-ink-accentScreen ml-0.5" fill="currentColor" />
                                            </div>
                                            {space.completionRate === 0 && (
                                                <span
                                                    className="absolute bottom-3 left-3.5 font-mono text-[11px]"
                                                    style={{ color: 'rgba(244,246,252,0.55)' }}
                                                >
                                                    Đã xem {formatDuration(space.lastWatchedPositionSec || 0)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 px-6 py-5 flex flex-col min-w-0">
                                            <div className="text-[12.5px] font-medium text-ink-textMuted mb-1.5">Đang học</div>
                                            <div className="text-lg font-bold text-ink-text leading-snug line-clamp-2">{space.title}</div>
                                            <div className="text-[13.5px] text-ink-textMuted mt-2">{space.lessonCount} bài</div>
                                            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-ink-accent pt-4">
                                                Tiếp tục học <ArrowRight size={15} />
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-ink-panel border border-dashed border-ink-border rounded-ink-md p-6 text-center">
                                <p className="text-sm text-ink-textMuted">Bạn chưa có Space nào đang học. Dán link video ở trên hoặc chọn một Space bên dưới để bắt đầu.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* SEARCH RESULTS MODE vs DISCOVERY MODE */}
                {searchQuery ? (
                    /* Search Results */
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-ink-text">
                                Kết quả cho &quot;{searchQuery}&quot;
                            </h2>
                            {appState === 'success' && spaces.length > 0 && (
                                <span className="text-xs text-ink-textDim">{spaces.length} Space</span>
                            )}
                        </div>

                        <SpaceList
                            spaces={spaces}
                            loading={appState === 'loading'}
                            onSpaceClick={handleSpaceClick}
                        />
                    </section>
                ) : (
                    /* KHU VỰC 2: "Khám phá Space nổi bật" (2 Tầng) */
                    <div className="space-y-10">
                        {/* TẦNG 1: Space Mẫu (Showcase) — 1 dòng + nút xem tất cả */}
                        {showcaseSpaces.length > 0 && (
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-ink-text">Space Tuyển Chọn</h2>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-ink-accentA text-ink-accent rounded-full border border-ink-border">
                                            Chất lượng cao
                                        </span>
                                    </div>
                                    {showcaseSpaces.length > 3 && (
                                        <button
                                            onClick={() => setShowAllShowcase(!showAllShowcase)}
                                            className="text-xs font-semibold text-ink-accent hover:text-ink-accent/80 flex items-center gap-1 transition-colors"
                                        >
                                            {showAllShowcase ? 'Thu gọn ↑' : `Xem tất cả (${showcaseSpaces.length}) →`}
                                        </button>
                                    )}
                                </div>

                                <SpaceList
                                    spaces={showAllShowcase ? showcaseSpaces : showcaseSpaces.slice(0, 3)}
                                    loading={appState === 'loading'}
                                    onSpaceClick={handleSpaceClick}
                                />
                            </section>
                        )}

                        {/* TẦNG 2: Space Phổ biến nhất (Cộng đồng) — nhiều hơn 1 dòng (2 dòng = 6 cards) + nút xem tất cả */}
                        {displayPopularSpaces.length > 0 && (
                            <section>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-ink-text">Space Phổ biến nhất</h2>
                                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-ink-page text-ink-textMid rounded-full border border-ink-border">
                                            Nhiều người học
                                        </span>
                                    </div>
                                    {displayPopularSpaces.length > 6 && (
                                        <button
                                            onClick={() => setShowAllPopular(!showAllPopular)}
                                            className="text-xs font-semibold text-ink-accent hover:text-ink-accent/80 flex items-center gap-1 transition-colors"
                                        >
                                            {showAllPopular ? 'Thu gọn ↑' : `Xem tất cả (${displayPopularSpaces.length}) →`}
                                        </button>
                                    )}
                                </div>

                                <SpaceList
                                    spaces={showAllPopular ? displayPopularSpaces : displayPopularSpaces.slice(0, 6)}
                                    loading={appState === 'loading'}
                                    onSpaceClick={handleSpaceClick}
                                />
                            </section>
                        )}
                    </div>
                )}

                {appState === 'error' && errorMessage && (
                    <div className="flex flex-col items-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-ink-textMid mb-3">{errorMessage}</p>
                        <Button
                            variant="link"
                            onClick={() => fetchSpaces(debouncedSearchQuery)}
                        >
                            Thử lại
                        </Button>
                    </div>
                )}
            </main>

            {/* ── Sales Agent Widget ─────────────────────────────────────────────
                Appears only in high-intent moments:
                  • Guest viewing homepage → onboarding + intro
                  • Logged-in user with no spaces yet → subscription nudge
                Not shown during active search (user is task-focused).
            ──────────────────────────────────────────────────────────────────── */}
            {!searchQuery && (
                !user
                    ? <SalesAgentWidget context="homepage_guest" />
                    : continueState === 'loaded' && continueSpaces.length === 0
                        ? <SalesAgentWidget context="homepage_no_spaces" userName={user.fullName} />
                        : null
            )}
        </div>
    );
}
