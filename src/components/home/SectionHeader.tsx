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
}

// Header dùng chung cho các mục khám phá ở "/": tiêu đề + câu tiêu chí bên
// trái, nút mở rộng bên phải. Không dùng mũi tên "→" trong chữ; icon chevron
// xoay theo trạng thái để nói "cái gì vừa đổi".
export default function SectionHeader({ title, criterion, total = 0, expanded, onToggle, visibleCount = 0 }: SectionHeaderProps) {
    const canToggle = !!onToggle && total > visibleCount;
    return (
        <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink-text leading-tight">{title}</h2>
                <p className="text-[13px] text-ink-textMuted mt-0.5">{criterion}</p>
            </div>
            {canToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={expanded}
                    className="vd-focusable shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-accent hover:text-ink-accent/80 transition-colors pb-0.5"
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
