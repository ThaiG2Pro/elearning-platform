'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getMyLearningSpaces } from '@/lib/space';
import { createSpace, createSpaceFromLink, archiveSpace, unarchiveSpace } from '@/lib/management';
import { copySharedSpace } from '@/lib/spaces';
import Toast from '@/components/Toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MyLearningSpace } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

// 2026-09-06 — gộp /my-spaces vào đây (xem "quy hoạch /my-learning vs
// /my-spaces"): 2 trang trước đó đọc CÙNG 1 tập space (owner_id = userId,
// tự tạo lẫn clone/fork trộn chung), chỉ khác annotate (tiến độ học vs.
// trạng thái lưu trữ) — tách 2 route rời khiến field mới (vd clonedFrom)
// phải cài 2 lần, và người dùng phải nhớ "trang nào thì click đi đâu"
// (my-spaces: click = sửa; my-learning: click = học).
//
// Thiết kế gộp — 3 quy tắc để không ngợp / không phải nhớ thao tác:
//  1. Click nguyên card LUÔN LUÔN = Học tiếp (hành vi hay dùng nhất, không
//     đổi nghĩa theo trạng thái).
//  2. Hành động hiếm (Sửa nội dung / Lưu trữ) ẩn sau nút "⋮", chỉ hiện khi
//     người dùng chủ động mở — không chiếm chỗ mặc định.
//  3. Trạng thái lưu trữ không phải 1 tab ngang hàng cạnh tranh chú ý — gấp
//     vào 1 dòng link cuối trang ("Đã lưu trữ (N)"), đúng tinh thần "cất đi
//     thì khuất mắt". Trục hiển thị mặc định là TIẾN ĐỘ HỌC (việc làm hằng
//     ngày), sắp xếp sẵn ưu tiên: đang học → chưa bắt đầu → hoàn thành, để
//     không bắt người dùng tự bấm lọc mỗi lần vào trang.
export default function MyLearningPage() {
    const router = useRouter();

    const [spaces, setSpaces] = useState<MyLearningSpace[]>([]);
    // Trục lọc phụ (escape hatch) — ẩn mặc định, không phải chrome chính.
    const [progressFilter, setProgressFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [appState, setAppState] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // --- Tạo Space (ported từ /my-spaces — trang gộp vẫn cần lối tạo mới) ---
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showBlankModal, setShowBlankModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [pasteUrl, setPasteUrl] = useState('');
    const [pasteError, setPasteError] = useState<string | null>(null);
    const [createdSpace, setCreatedSpace] = useState<{ spaceId: string; title: string; titleIsPlaceholder: boolean } | null>(null);
    // 2026-09-11 — video đã có sẵn trong showcase space nào chưa (xem page.tsx).
    const [suggestedSpace, setSuggestedSpace] = useState<{ spaceId: string; title: string; shareToken: string; lessonCount: number } | null>(null);
    const pasteInputRef = useRef<HTMLInputElement>(null);

    // Không truyền `filter` cho API — luôn lấy TOÀN BỘ space sở hữu 1 lần,
    // rồi nhóm/lọc/sắp xếp ở client (mặc định ưu tiên đang học, gấp phần
    // lưu trữ) thay vì round-trip lại server mỗi lần đổi lọc/mở "Đã lưu trữ".
    const loadSpaces = useCallback(async () => {
        setAppState('loading');
        setErrorMessage(null);

        try {
            const response = await getMyLearningSpaces();
            setSpaces(response.spaces);
            setAppState('idle');
        } catch (error: any) {
            setAppState('error');
            setErrorMessage(error.message || 'Có lỗi xảy ra khi tải danh sách Space.');
        }
    }, []);

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

    // Quy tắc #1 — click nguyên card luôn đi Học tiếp, không phân nhánh theo
    // trạng thái lưu trữ/tiến độ, để không ai phải nhớ "space này thì click
    // đi đâu".
    const handleSpaceClick = (spaceId: string) => {
        router.push(`/spaces/${spaceId}/learn`);
    };

    const handleEdit = (spaceId: string) => {
        setOpenMenuId(null);
        router.push(`/my-spaces/${spaceId}/edit`);
    };

    const handleToggleArchive = async (space: MyLearningSpace) => {
        setOpenMenuId(null);
        const isArchived = space.lifecycleStatus === 'ARCHIVED';
        setArchivingId(space.id);
        setActionError(null);
        try {
            if (isArchived) {
                await unarchiveSpace(Number(space.id));
            } else {
                await archiveSpace(Number(space.id));
            }
            // Optimistic — không refetch cả danh sách chỉ để đổi 1 field.
            setSpaces(prev => prev.map(s => s.id === space.id
                ? { ...s, lifecycleStatus: isArchived ? 'ACTIVE' : 'ARCHIVED' }
                : s));
        } catch (err: any) {
            setActionError(err.message || 'Không thể cập nhật trạng thái lưu trữ.');
        } finally {
            setArchivingId(null);
        }
    };

    const handleRetry = () => {
        loadSpaces();
    };

    const isPlaylistUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url)
        && /[?&]list=/.test(url)
        && !/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);

    const handleCreateFromLink = async (opts?: { confirmCreate?: boolean }) => {
        const url = pasteUrl.trim();
        if (!url) return;
        if (isPlaylistUrl(url)) {
            setPasteError('Nhập playlist đang được phát triển — dán link từng video nhé!');
            return;
        }
        setPasteError(null);
        setCreating(true);
        try {
            const res = await createSpaceFromLink(url, opts?.confirmCreate ?? false);
            if (res.type === 'SUGGESTION') {
                setSuggestedSpace(res.suggestedSpace);
                return;
            }
            setPasteUrl('');
            setSuggestedSpace(null);
            setCreatedSpace(res);
        } catch (err: any) {
            setPasteError(err.message || 'Lỗi khi tạo Space');
        } finally {
            setCreating(false);
        }
    };

    // "Clone space này" — video đã có sẵn trong showcase space gợi ý.
    const handleCloneSuggestedSpace = async () => {
        if (!suggestedSpace) return;
        setCreating(true);
        try {
            const { spaceId } = await copySharedSpace(suggestedSpace.shareToken);
            setPasteUrl('');
            setSuggestedSpace(null);
            router.push(`/spaces/${spaceId}/learn`);
        } catch (err: any) {
            setPasteError(err.message || 'Lỗi khi sao chép Space');
        } finally {
            setCreating(false);
        }
    };

    const handleCreateBlank = async () => {
        setCreateError(null);
        setCreating(true);
        try {
            const res = await createSpace({
                title: newTitle.trim() || 'Space mới',
                description: newDesc.trim(),
            });
            setShowBlankModal(false);
            setNewTitle('');
            setNewDesc('');
            router.push(`/my-spaces/${res.spaceId || res.id}/edit`);
        } catch (err: any) {
            setCreateError(err.message || 'Lỗi khi tạo Space');
        } finally {
            setCreating(false);
        }
    };

    const closeBlankModal = () => {
        setShowBlankModal(false);
        setNewTitle('');
        setNewDesc('');
        setCreateError(null);
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
    const STATUS_ORDER: Record<MyLearningSpace['status'], number> = {
        in_progress: 0,
        not_started: 1,
        completed: 2,
    };

    // Quy tắc #3 — lưu trữ gấp lại, không phải tab ngang hàng; tiến độ là
    // trục hiển thị mặc định, sắp sẵn thứ tự ưu tiên thay vì bắt bấm lọc.
    const nonArchived = spaces.filter(s => s.lifecycleStatus !== 'ARCHIVED');
    const archived = spaces.filter(s => s.lifecycleStatus === 'ARCHIVED');
    const visibleSpaces = (progressFilter === 'all' ? nonArchived : nonArchived.filter(s => s.status === progressFilter))
        .slice()
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
            || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const renderCard = (space: MyLearningSpace, i: number, list: MyLearningSpace[], archivedRow: boolean) => (
        <div
            key={space.id}
            onClick={() => handleSpaceClick(space.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSpaceClick(space.id); }}
            className={`vd-focusable flex items-stretch cursor-pointer transition-colors hover:bg-ink-page ${i < list.length - 1 ? 'border-b border-ink-border' : ''}`}
        >
            <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                {String(i + 1).padStart(2, '0')}
            </span>

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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-[11px] text-ink-textDim">{space.lessonCount} bài</span>
                        <span className="font-mono text-[11px] text-ink-textDim">{formatDate(space.createdAt)}</span>
                        {space.clonedFrom && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-ink-page text-ink-textMuted border border-ink-border"
                                title={`Bản sao chép từ Space gốc của ${space.clonedFrom.ownerName}`}
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Bản sao của {space.clonedFrom.ownerName}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quy tắc thị giác thụ động — trạng thái/tiến độ hiện ngay
                    trên card, không cần bấm lọc mới biết. */}
                {!archivedRow && (
                    <div className="flex items-center gap-2.5 shrink-0 sm:w-[170px]">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 bg-ink-page text-ink-textMid border border-ink-border">
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
                )}

                {/* Quy tắc #2 — hành động hiếm (Sửa/Lưu trữ) ẩn sau "⋮", vị
                    trí cố định mọi card, không chiếm chỗ mặc định. */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setOpenMenuId(openMenuId === space.id ? null : space.id)}
                        disabled={archivingId === space.id}
                        aria-label="Thao tác khác"
                        className="vd-focusable w-8 h-8 flex items-center justify-center rounded-lg text-ink-textMuted hover:text-ink-text hover:bg-ink-page transition-colors disabled:opacity-50"
                    >
                        {archivingId === space.id ? (
                            <span className="text-[11px]">...</span>
                        ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                        )}
                    </button>
                    {openMenuId === space.id && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-ink-panel border border-ink-border rounded-ink-md shadow-lg z-20 overflow-hidden">
                                <button
                                    onClick={() => { setOpenMenuId(null); handleSpaceClick(space.id); }}
                                    className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-sm text-ink-text hover:bg-ink-page transition-colors"
                                >
                                    Học tiếp
                                </button>
                                <button
                                    onClick={() => handleEdit(space.id)}
                                    className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-sm text-ink-text hover:bg-ink-page transition-colors border-t border-ink-border"
                                >
                                    Sửa nội dung
                                </button>
                                <button
                                    onClick={() => handleToggleArchive(space)}
                                    className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-sm text-ink-text hover:bg-ink-page transition-colors border-t border-ink-border"
                                >
                                    {space.lifecycleStatus === 'ARCHIVED' ? 'Khôi phục' : 'Lưu trữ'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.015em] text-ink-text mb-1">
                            Space của tôi
                        </h1>
                        <p className="text-sm text-ink-textMuted">
                            {appState === 'idle' && spaces.length > 0 ? `${spaces.length} Space — ` : ''}Tiếp tục hành trình học tập, hoặc chỉnh sửa nội dung bạn đã tạo
                        </p>
                    </div>
                    {/* Escape hatch — ẩn mặc định, không phải chrome chính (Quy tắc #3). */}
                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className="text-xs text-ink-textMuted hover:text-ink-text underline underline-offset-2 whitespace-nowrap"
                    >
                        Lọc & sắp xếp {filterOpen ? '▾' : '›'}
                    </button>
                </div>

                {filterOpen && (
                    <div className="mb-5 flex items-center gap-1.5 flex-wrap">
                        {([
                            ['all', 'Tất cả'],
                            ['in_progress', 'Đang học'],
                            ['not_started', 'Chưa bắt đầu'],
                            ['completed', 'Hoàn thành'],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setProgressFilter(value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${progressFilter === value ? 'bg-ink-accent text-white' : 'bg-ink-panel border border-ink-border text-ink-textMid hover:bg-ink-page'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Hero paste-box — ported từ /my-spaces, trang gộp vẫn cần lối tạo mới. */}
                {!createdSpace && !suggestedSpace && (
                    <section className="mb-6 bg-ink-accent rounded-ink-md p-6 shadow-ink-sm">
                        <h2 className="text-lg font-bold text-white">Dán link YouTube, tạo Space ngay</h2>
                        <p className="text-sm text-ink-onAccent/80 mt-0.5">Hệ thống tự lấy tiêu đề, ảnh và tạo bài học đầu tiên.</p>
                        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-2">
                            <input
                                ref={pasteInputRef}
                                type="text"
                                value={pasteUrl}
                                onChange={(e) => setPasteUrl(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFromLink(); }}
                                placeholder="https://www.youtube.com/watch?v=..."
                                disabled={creating}
                                className="flex-1 px-3 py-2.5 rounded-lg border-0 text-sm text-ink-text placeholder:text-ink-textDim focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-60"
                            />
                            <Button
                                onClick={() => handleCreateFromLink()}
                                disabled={creating || !pasteUrl.trim()}
                                variant="secondary"
                                className="vd-focusable whitespace-nowrap"
                            >
                                {creating ? 'Đang tạo…' : 'Tạo Space'}
                            </Button>
                        </div>
                        {pasteError && (
                            <p className="mt-2 text-sm text-ink-onAccent bg-ink-text/15 rounded-lg px-3 py-2">{pasteError}</p>
                        )}
                        <button
                            onClick={() => { setCreateError(null); setShowBlankModal(true); }}
                            disabled={creating}
                            className="mt-3 text-xs text-ink-onAccent/80 hover:text-white underline underline-offset-2"
                        >
                            Tạo Space trống
                        </button>
                    </section>
                )}

                {/* 2026-09-11 — video đã có sẵn trong 1 showcase space (xem page.tsx). */}
                {suggestedSpace && (
                    <section className="mb-6 bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm vd-ink-in">
                        <p className="text-xs font-semibold text-ink-accent uppercase tracking-wide mb-1">Video này đã có sẵn</p>
                        <h2 className="text-lg font-bold text-ink-text">{suggestedSpace.title}</h2>
                        <p className="text-sm text-ink-textMuted mt-1">
                            Đã có Space với {suggestedSpace.lessonCount} bài học chứa video này — sao chép về học luôn thay vì tạo Space rỗng mới.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <Button disabled={creating} onClick={handleCloneSuggestedSpace}>
                                {creating ? 'Đang sao chép…' : 'Clone Space này'}
                            </Button>
                            <Button variant="outline" disabled={creating} onClick={() => handleCreateFromLink({ confirmCreate: true })}>
                                Vẫn tạo Space mới
                            </Button>
                            <Button variant="ghost" onClick={() => setSuggestedSpace(null)}>
                                Dán link khác
                            </Button>
                        </div>
                        {pasteError && (
                            <p className="mt-2 text-sm text-ink-wrong bg-ink-wrongA border border-ink-wrong/30 rounded-lg px-3 py-2">{pasteError}</p>
                        )}
                    </section>
                )}

                {createdSpace && (
                    <section className="mb-6 bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm vd-ink-in">
                        <p className="text-xs font-semibold text-ink-textMid uppercase tracking-wide mb-1">Đã tạo Space</p>
                        <h2 className="text-lg font-bold text-ink-text">{createdSpace.title}</h2>
                        {createdSpace.titleIsPlaceholder && (
                            <p className="text-sm text-ink-warning bg-ink-warningA border border-ink-warningBorder rounded-lg px-3 py-2 mt-2">
                                Không đọc được tên video từ YouTube — đã đặt tên tạm, bạn có thể đổi trong phần chỉnh sửa.
                            </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <Button onClick={() => router.push(`/spaces/${createdSpace.spaceId}/learn`)}>
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

                {createError && (
                    <Toast message={createError} type="error" onClose={() => setCreateError(null)} />
                )}
                {actionError && (
                    <Toast message={actionError} type="error" onClose={() => setActionError(null)} />
                )}

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

                    {appState === 'idle' && visibleSpaces.length > 0 && visibleSpaces.map((space, i) => renderCard(space, i, visibleSpaces, false))}

                    {appState === 'idle' && visibleSpaces.length === 0 && (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-ink-page flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-ink-textMid mb-1">
                                {spaces.length === 0 ? 'Chưa có Space' : 'Không có Space nào khớp bộ lọc'}
                            </h3>
                            <p className="text-sm text-ink-textMuted mb-4">
                                {spaces.length === 0 ? 'Dán 1 link YouTube ở trên để tạo Space đầu tiên.' : 'Thử đổi bộ lọc ở trên.'}
                            </p>
                            {spaces.length === 0 && (
                                <Button onClick={() => pasteInputRef.current?.focus()}>
                                    Tạo Space đầu tiên
                                </Button>
                            )}
                        </div>
                    )}

                    {appState === 'error' && (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Quy tắc #3 — lưu trữ gấp lại cuối trang, không cạnh tranh
                    chú ý với danh sách chính. */}
                {appState === 'idle' && archived.length > 0 && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowArchived(v => !v)}
                            className="text-xs text-ink-textMuted hover:text-ink-text underline underline-offset-2"
                        >
                            {showArchived ? 'Ẩn mục đã lưu trữ ▾' : `Đã lưu trữ (${archived.length}) ›`}
                        </button>
                        {showArchived && (
                            <div className="mt-3 bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden opacity-80">
                                {archived.map((space, i) => renderCard(space, i, archived, true))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Dialog open={showBlankModal} onOpenChange={(open) => { if (!open) closeBlankModal(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo Space mới</DialogTitle>
                        <DialogDescription>
                            Nhập tên và mô tả cho Space mới của bạn. Sau khi tạo, bạn có thể thêm các chương và bài học.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="block text-xs font-semibold text-ink-text mb-1">Tên Space</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBlank(); }}
                                placeholder="Ví dụ: Lập trình Python cơ bản…"
                                autoFocus
                                className="w-full px-3 py-2 border border-ink-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ink-text mb-1">Mô tả (tùy chọn)</label>
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Mô tả ngắn gọn nội dung Space…"
                                rows={3}
                                className="w-full px-3 py-2 border border-ink-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeBlankModal} disabled={creating}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreateBlank} disabled={creating}>
                            {creating ? 'Đang tạo…' : 'Tạo Space'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
