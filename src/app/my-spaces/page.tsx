'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getOwnedSpaces, createSpace, createSpaceFromLink, archiveSpace, unarchiveSpace } from '@/lib/management';
import Toast from '@/components/Toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ManagedSpace } from '@/types/management.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type Status = 'All' | 'Active' | 'Archived';

const MySpacesPage = () => {
    const [spaces, setSpaces] = useState<ManagedSpace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<Status>('All');
    const [user, setUser] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showBlankModal, setShowBlankModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [archivingId, setArchivingId] = useState<number | null>(null);
    const router = useRouter();

    // WP1.10.3 — hero paste-box thay 2 nút cũ. `pasteUrl` là input chính của
    // trang; sau khi tạo xong, `createdSpace` giữ kết quả để hiện card lựa
    // chọn "Học ngay" / "Thêm quiz/tóm tắt trước khi học" thay vì redirect
    // thẳng vào editor như trước.
    const [pasteUrl, setPasteUrl] = useState('');
    const [pasteError, setPasteError] = useState<string | null>(null);
    const [createdSpace, setCreatedSpace] = useState<{ spaceId: string; title: string; titleIsPlaceholder: boolean } | null>(null);
    const pasteInputRef = useRef<HTMLInputElement>(null);

    const fetchSpaces = useCallback(async (status?: Status) => {
        setLoading(true);
        setError(null);
        try {
            // If status is 'All' we pass undefined so the API returns all spaces
            const apiStatus = status === 'All' ? undefined : status;
            const params = apiStatus ? { status: apiStatus } : undefined;
            const response = await getOwnedSpaces(params);
            // Guard against unexpected API shapes — API may return either an array or { spaces: [] }
            const normalized = Array.isArray(response) ? response : response?.spaces || [];
            setSpaces(normalized);
        } catch (err: any) {
            // On error ensure we reset to an empty list to avoid undefined runtime errors
            setSpaces([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadUser = useCallback(() => {
        if (AuthUtils.isAuthenticated()) {
            const userData = AuthUtils.getCurrentUser();
            setUser(userData);
        }
    }, []);

    useEffect(() => {
        fetchSpaces(selectedStatus);
        loadUser();
    }, [selectedStatus, fetchSpaces, loadUser]);

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

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status as Status);
    };

    const handleCreateBlank = async () => {
        setCreateError(null);
        setCreating(true);
        try {
            const res = await createSpace({
                title: newTitle.trim() || 'Space mới',
                description: newDesc.trim()
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

    // WP1.10.2 — chặn URL playlist ngay ở ô nhập, không đợi round-trip server
    // (dùng lại đúng luật server: có `list=` nhưng không có video id cụ thể).
    const isPlaylistUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url)
        && /[?&]list=/.test(url)
        && !/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);

    const handleCreateFromLink = async () => {
        const url = pasteUrl.trim();
        if (!url) return;
        if (isPlaylistUrl(url)) {
            setPasteError('Chưa hỗ trợ playlist — dán link từng video.');
            return;
        }
        setPasteError(null);
        setCreating(true);
        try {
            const res = await createSpaceFromLink(url);
            setPasteUrl('');
            setCreatedSpace(res);
        } catch (err: any) {
            setPasteError(err.message || 'Lỗi khi tạo Space');
        } finally {
            setCreating(false);
        }
    };

    const handleSpaceClick = (space: ManagedSpace) => {
        router.push(`/my-spaces/${space.id}/edit`);
    };

    const handleToggleArchive = async (e: React.MouseEvent, space: ManagedSpace) => {
        e.stopPropagation();
        const isActive = ((space.status || '') as string).toUpperCase() === 'ACTIVE';
        setArchivingId(space.id);
        try {
            if (isActive) {
                await archiveSpace(space.id);
            } else {
                await unarchiveSpace(space.id);
            }
            if (selectedStatus === 'All') {
                setSpaces(prev => prev.map(c => c.id === space.id ? { ...c, status: isActive ? 'Archived' : 'Active' } : c));
            } else {
                setSpaces(prev => prev.filter(c => c.id !== space.id));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setArchivingId(null);
        }
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'ACCESS_DENIED':
                return 'Bạn không có quyền xem danh sách này';
            case 'UNAUTHORIZED':
                return 'Phiên đăng nhập đã hết hạn';
            case 'SPACE_NOT_FOUND':
                return 'Không tìm thấy thông tin Space';
            default:
                return 'Hệ thống không thể tải danh sách Space lúc này';
        }
    };

    const closeBlankModal = () => {
        setShowBlankModal(false);
        setNewTitle('');
        setNewDesc('');
        setCreateError(null);
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />
            {/* py-7 md:py-10 — cùng nhịp khoảng cách đã áp cho các trang khác
                (homepage/space-detail/about/my-learning). */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
                <div className="mb-6">
                    <h1 className="text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.015em] text-ink-text">Space của tôi</h1>
                    <p className="text-sm text-ink-textMuted mt-0.5">
                        {!loading && spaces.length > 0 ? `${spaces.length} Space — ` : ''}Quản lý và chỉnh sửa Space
                    </p>
                </div>

                {/* WP1.10.3 — hero paste-box thay cặp nút "Tạo khóa học"/"Tạo từ
                    link YouTube" cũ: nhập tối thiểu 1 URL, không hỏi tên. Sau khi
                    tạo xong hiện card lựa chọn (bên dưới) thay vì redirect thẳng
                    vào editor. "Tạo Space trống" tụt xuống thành link phụ. */}
                {!createdSpace && (
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
                                onClick={handleCreateFromLink}
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

                {/* WP1.10.3 — card lựa chọn sau khi dán URL thành công. */}
                {createdSpace && (
                    // vd-ink-in — "hạ mực": card vừa xuất hiện ngay sau khi tạo
                    // Space thành công (đồng bộ motif với quiz-result ở learn/page.tsx).
                    <section className="mb-6 bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm vd-ink-in">
                        <p className="text-xs font-semibold text-ink-textMid uppercase tracking-wide mb-1">Đã tạo Space</p>
                        <h2 className="text-lg font-bold text-ink-text">{createdSpace.title}</h2>
                        {createdSpace.titleIsPlaceholder && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
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

                {/* Section 01: Bộ lọc trạng thái */}
                <div className="mb-6">
                    <Tabs value={selectedStatus} onValueChange={handleStatusChange}>
                        <TabsList>
                            <TabsTrigger value="All">Tất cả</TabsTrigger>
                            <TabsTrigger value="Active">Hoạt động</TabsTrigger>
                            <TabsTrigger value="Archived">Lưu trữ</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {createError && (
                    <Toast message={createError} type="error" onClose={() => setCreateError(null)} />
                )}

                {/* Section 02: Danh sách Space — "giá sách" từ vibe-demo/spaces, cùng
                    motif dòng-đánh-số đã áp cho my-learning; giữ thumbnail thật thay
                    "gáy sách" màu (xem lý do ở my-learning/page.tsx). */}
                {loading ? (
                    <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className={`flex items-stretch p-4 gap-4 ${index < 4 ? 'border-b border-ink-border' : ''}`}>
                                <Skeleton className="w-24 aspect-video rounded-ink-sm bg-ink-page shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <Skeleton className="h-4 w-1/2 bg-ink-page" />
                                    <Skeleton className="h-3 w-1/3 bg-ink-page" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p className="text-sm text-ink-textMid mb-4">{getErrorMessage(error)}</p>
                        <Button onClick={() => fetchSpaces(selectedStatus)}>
                            Thử lại
                        </Button>
                    </div>
                ) : (!spaces || spaces.length === 0) ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-ink-page flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-ink-text mb-1">Không có Space</h3>
                        <p className="text-sm text-ink-textMuted mb-5">Bạn chưa có Space nào trong mục này.</p>
                        {/* WP1.6.4 — ownership-based, not role-gated: every user owns their
                            own personal spaces now (management/spaces route already
                            dropped this same check at WP1.5.10). A STUDENT-role user
                            landing here with 0 spaces had no way to create their first
                            one, unlike the identical "dán link" box on the homepage which
                            never checked role. */}
                        {user && (
                            <Button onClick={() => pasteInputRef.current?.focus()}>
                                Tạo Space đầu tiên
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                        {spaces.map((space, i) => {
                            const isActive = ((space.status || '') as string).toUpperCase() === 'ACTIVE';
                            return (
                            <div
                                key={space.id}
                                onClick={() => handleSpaceClick(space)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSpaceClick(space); }}
                                className={`vd-focusable flex items-stretch cursor-pointer transition-colors hover:bg-ink-page ${i < spaces.length - 1 ? 'border-b border-ink-border' : ''}`}
                            >
                                <span className="hidden sm:flex w-10 shrink-0 items-start justify-center pt-4 font-mono text-[11px] text-ink-textDim">
                                    {String(i + 1).padStart(2, '0')}
                                </span>

                                {/* Thumbnail thật — thay "gáy sách" màu của vibe-demo/spaces. */}
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
                                            <svg className="w-6 h-6 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 py-3.5 px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 title={space.title} className="text-sm font-semibold text-ink-text leading-snug truncate">{space.title}</h3>
                                        {/* WP1.10.6 — badge "N bài" phân biệt hình thái (1 video vs
                                            nhiều chương/bài), không thêm tab/lọc riêng theo nguồn. */}
                                        {typeof space.lessonCount === 'number' && (
                                            <span className="font-mono text-[11px] text-ink-textDim">{space.lessonCount} bài</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${isActive ? 'bg-ink-page text-ink-textMid' : 'bg-ink-page text-ink-textMuted'}`}
                                        >
                                            {isActive ? 'Hoạt động' : 'Lưu trữ'}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={archivingId === space.id}
                                            onClick={(e) => handleToggleArchive(e, space)}
                                        >
                                            {archivingId === space.id ? '...' : isActive ? 'Lưu trữ' : 'Khôi phục'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal tạo Space trống — đường phụ, giữ nguyên cho người tự soạn
                cấu trúc nhiều chương/bài (WP1.10.3 §3.6: không sửa). */}
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
};

export default MySpacesPage;
