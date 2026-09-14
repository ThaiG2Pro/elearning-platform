import Image from 'next/image';
import { Space } from '@/types/space.types';

interface SpaceCardProps {
    space: Space;
    onClick?: (spaceId: number) => void;
    // Trang chủ (2026-09-14): số thứ hạng cho mục "Phổ biến nhất" — mục này
    // đúng nghĩa là bảng xếp hạng nên đánh số mang thông tin, không trang trí.
    rank?: number;
    // Ẩn badge "Tuyển chọn" khi card đã nằm trong chính mục Tuyển chọn.
    hideShowcaseBadge?: boolean;
    // Bỏ mô tả, dùng cho mục phụ (Mới nổi) để nhẹ hơn mục chính.
    compact?: boolean;
}

export default function SpaceCard({ space, onClick, rank, hideShowcaseBadge, compact }: SpaceCardProps) {

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`${space.title} - ${space.description ?? ''}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(space.id); }}
            className="group bg-ink-panel rounded-ink-md border border-ink-border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-ink-borderHi hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink-accent"
            onClick={() => onClick?.(space.id)}
        >
            {/* Thumbnail */}
            <div className="w-full aspect-video bg-ink-page flex items-center justify-center overflow-hidden relative">
                {typeof rank === 'number' && (
                    <span
                        className="absolute top-3 left-3 z-[1] min-w-[30px] h-[30px] px-2 rounded-md bg-ink-accent font-mono text-[13px] font-bold text-white flex items-center justify-center shadow-ink-sm"
                        aria-label={`Hạng ${rank}`}
                    >
                        {rank}
                    </span>
                )}
                {space.thumbnailUrl ? (
                    <Image
                        src={space.thumbnailUrl}
                        alt={space.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-ink-textMuted">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                        </svg>
                        <span className="text-xs">Chưa có ảnh</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {space.isShowcase && !hideShowcaseBadge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-ink-accentA text-ink-accent border border-ink-border">
                            Tuyển chọn
                        </span>
                    )}
                    {typeof space.cloneCount === 'number' && space.cloneCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-ink-page text-ink-textMid border border-ink-border">
                            {space.cloneCount} người cùng học
                        </span>
                    )}
                    {/* UI (2026-09-05) — phân biệt bản clone/fork với bản gốc
                        chính chủ, tránh nhầm 2 kết quả trông giống hệt nhau. */}
                    {space.clonedFrom && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-ink-page text-ink-textMuted border border-ink-border"
                            title={`Bản sao chép từ Space gốc của ${space.clonedFrom.ownerName}`}
                        >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Bản sao của {space.clonedFrom.ownerName}
                        </span>
                    )}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-ink-text leading-snug line-clamp-2 flex-1">{space.title}</h3>
                </div>
                {!compact && space.description && (
                    <p className="text-ink-textMuted text-xs line-clamp-2 leading-relaxed">{space.description}</p>
                )}

                {typeof (space as any).completionRate === 'number' && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-ink-textMuted mb-1">
                            <span>Tiến độ</span>
                            <span className="font-medium">{(space as any).completionRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-ink-page rounded-full overflow-hidden">
                            <div
                                className="h-full bg-ink-accent rounded-full transition-all"
                                style={{ width: `${(space as any).completionRate}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
