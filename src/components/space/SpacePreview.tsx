'use client';

import Image from 'next/image';
import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MARGIN_W } from '@/lib/vibe/theme';

// Shape TỐI THIỂU mà cả SpaceDetail (spaces/[id]) lẫn PublicSpace (share/[token])
// đều thoả — hai trang tự chuẩn hoá về đây ở call site (share tính isOwner từ
// ownerId; spaces đã có sẵn flag). Các trường CHỈ một trang có (completionRate,
// companions) không nằm ở đây — chúng vào qua slot infoExtra/aside.
export interface SpacePreviewData {
    title: string;
    description?: string | null;
    ownerName?: string | null;
    thumbnailUrl?: string;
    isOwner: boolean;
    chapters: {
        id: number;
        title: string;
        lessons: { id: number; title: string; type: string }[];
    }[];
}

interface SpacePreviewProps {
    state: 'loading' | 'error' | 'ready';
    errorMessage?: string | null;
    /** Nút back (luôn hiện) + nút trong error state. */
    onBack: () => void;
    /** Bắt buộc khi state==='ready'. */
    data?: SpacePreviewData;
    /** Nhãn "Space của bạn" / "được chia sẻ" — chữ & màu khác nhau giữa 2 trang. */
    badge?: ReactNode;
    /** Chèn trong info card, dưới mô tả — progress bar (spaces-only). */
    infoExtra?: ReactNode;
    /** Sau playlist — section "Cùng học" (spaces-only). */
    aside?: ReactNode;
    /** Toàn bộ section nút hành động — logic riêng mỗi trang, page tự bọc <section>. */
    cta?: ReactNode;
}

/**
 * Khung xem-trước một Space — phần trình bày dùng chung giữa trang chi tiết
 * (spaces/[id]) và trang link chia sẻ (share/[token]), vốn là cặp sinh đôi
 * ~85%: back button, thumbnail banner, info card, playlist "trang vở kẻ lề",
 * cùng ba state loading/error/ready. KHÔNG nội-hoá logic phân nhánh CTA hay
 * owner-check (khác bản chất giữa hai trang) — chúng vào qua slot, giữ component
 * thuần trình bày. Header KHÔNG thuộc component này (mỗi trang truyền props
 * Header riêng); page bọc <div min-h-screen><Header/><SpacePreview/></div>.
 */
export default function SpacePreview({ state, errorMessage, onBack, data, badge, infoExtra, aside, cta }: SpacePreviewProps) {
    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-10">
            {/* Navigation Section */}
            <section className="mb-6">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm text-ink-textMuted hover:text-ink-text transition-colors focus:outline-none"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại danh sách
                </button>
            </section>

            {state === 'loading' ? (
                <div className="space-y-4">
                    <Skeleton className="h-64 rounded-ink-md bg-ink-pageDim" />
                    <Skeleton className="h-6 w-2/3 bg-ink-pageDim" />
                    <Skeleton className="h-4 w-1/3 bg-ink-pageDim" />
                    <Skeleton className="h-4 w-full bg-ink-pageDim" />
                    <Skeleton className="h-4 w-5/6 bg-ink-pageDim" />
                    <Skeleton className="h-10 w-32 mt-2 bg-ink-pageDim" />
                </div>
            ) : state === 'error' ? (
                <div className="flex flex-col items-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-ink-textMid mb-4">{errorMessage}</p>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-ink-accent hover:bg-ink-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Quay lại
                    </button>
                </div>
            ) : data ? (
                <>
                    {/* Visual Content Section (Thumbnail Banner) */}
                    <section className="mb-6">
                        <div className="w-full aspect-video bg-ink-page rounded-ink-md overflow-hidden border border-ink-border relative">
                            {data.thumbnailUrl ? (
                                <Image
                                    src={data.thumbnailUrl}
                                    alt={data.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 800px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-ink-textDim">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                    <span className="text-sm">Chưa có ảnh</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Information Section */}
                    <section className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm mb-6">
                        {badge}
                        <h1 className="text-[clamp(19px,2.2vw,24px)] font-bold tracking-[-0.01em] text-ink-text mb-3 leading-snug">{data.title}</h1>
                        {data.ownerName && (
                            <p className="text-sm text-ink-textMuted mb-2">
                                Tác giả: <span className="font-medium text-ink-text">{data.isOwner ? 'Bạn' : data.ownerName}</span>
                            </p>
                        )}
                        {data.description && (
                            <p className="text-sm text-ink-textMuted leading-relaxed">{data.description}</p>
                        )}
                        {infoExtra}
                    </section>

                    {/* Content Structure Section — motif renderPlaylist của vibe-demo:
                        số bài trong cột lề mono MARGIN_W, đường kẻ mực dọc LIÊN TỤC,
                        tên chương là dòng tiêu đề trong cùng dòng chảy. Ẩn tầng chương
                        khi space chỉ có 1 chương (khớp luật ở learn/share/editor). */}
                    {data.chapters && data.chapters.length > 0 && (
                        <section className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm mb-6 overflow-hidden">
                            <h2 className="text-xs font-semibold text-ink-textMuted uppercase tracking-wide px-6 py-3.5 border-b border-ink-border">
                                Nội dung Space
                            </h2>
                            <div className="py-1.5">
                                {data.chapters.map((chapter) => {
                                    // Đánh số bài liên tục trong từng chương (reset mỗi chương).
                                    let lessonNum = 0;
                                    return (
                                        <div key={chapter.id}>
                                            {data.chapters.length > 1 && (
                                                <div className="flex items-stretch">
                                                    <span style={{ width: MARGIN_W }} className="shrink-0" />
                                                    <p className="flex-1 border-l border-ink-marginLn pt-3 pb-1.5 pl-3.5 pr-4 text-sm font-semibold text-ink-text">
                                                        {chapter.title}
                                                    </p>
                                                </div>
                                            )}
                                            {chapter.lessons.map((lesson) => {
                                                lessonNum += 1;
                                                return (
                                                    <div key={lesson.id} className="flex items-stretch">
                                                        <span
                                                            style={{ width: MARGIN_W }}
                                                            className="shrink-0 flex items-start justify-center pt-[11px] font-mono text-[11px] text-ink-textDim"
                                                        >
                                                            {String(lessonNum).padStart(2, '0')}
                                                        </span>
                                                        <div className="flex-1 min-w-0 border-l border-ink-marginLn pt-2 pb-2 pl-3.5 pr-4 flex items-start justify-between gap-2">
                                                            <span className="text-sm text-ink-textMid leading-[1.4] min-w-0 truncate">{lesson.title}</span>
                                                            <span className="shrink-0 text-ink-textDim text-[11px] font-mono uppercase">{lesson.type}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {aside}

                    {cta}
                </>
            ) : null}
        </main>
    );
}
