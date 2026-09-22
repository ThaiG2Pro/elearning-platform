import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
    title: string;
    // 1 câu nói rõ tiêu chí của mục cho người đọc (thay pill nhãn kiểu
    // "Nhiều người học" không giải thích gì). Viết thường, không nhãn hoa.
    criterion: string;
    total?: number;
    expanded?: boolean;
    onToggle?: () => void;
    // Chỉ hiện nút khi có nhiều hơn số card đang hiện.
    visibleCount?: number;
    // 2026-09-22 — thay bung tại chỗ bằng link sang trang riêng khi mục có
    // quá nhiều item để bung trên trang chủ (Tuyển chọn → /spaces/tuyen-chon).
    // Có href thì bỏ qua expanded/onToggle.
    href?: string;
}

// Header dùng chung cho các mục khám phá ở "/": tiêu đề + câu tiêu chí bên
// trái, nút mở rộng bên phải. Không dùng mũi tên "→" trong chữ; icon chevron
// xoay theo trạng thái để nói "cái gì vừa đổi".
export default function SectionHeader({ title, criterion, total = 0, expanded, onToggle, visibleCount = 0, href }: SectionHeaderProps) {
    const canToggle = !href && !!onToggle && total > visibleCount;
    const canLink = !!href && total > visibleCount;
    const actionClass = 'vd-focusable shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-accent hover:text-ink-accent/80 transition-colors pb-0.5';
    return (
        <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink-text leading-tight">{title}</h2>
                <p className="text-[13px] text-ink-textMuted mt-0.5">{criterion}</p>
            </div>
            {canLink && (
                <Link href={href} className={actionClass}>
                    Xem tất cả {total}
                    <ChevronRight size={14} />
                </Link>
            )}
            {canToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={expanded}
                    className={actionClass}
                >
                    {expanded ? 'Thu gọn' : `Xem tất cả ${total}`}
                    <ChevronRight
                        size={14}
                        className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
                    />
                </button>
            )}
        </div>
    );
}
