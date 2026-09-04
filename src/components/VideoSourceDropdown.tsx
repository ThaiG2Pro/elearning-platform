'use client';

import { useEffect, useRef, useState } from 'react';

// 2026-09-04 — tách khỏi my-spaces/[id]/edit/page.tsx: listbox tự vẽ (thay
// <select> gốc, xem commit 7d6fe68) trước đây chỉ áp cho dropdown "Video
// nguồn" ở panel sửa lesson QUIZ, còn dropdown cùng chức năng trong
// AILessonComposer (dialog "Tạo quiz tại đây" / "Tạo tóm tắt" — công cụ cấp
// cả space) vẫn là <select> gốc nên list xổ xuống vẫn xấu mặc định như cũ.
// Dùng chung 1 component để sửa 1 chỗ là cả 2 nơi đều được.
//
// Nhận `options` đã có sẵn `label` hiển thị (không phải Lesson/AIVideoSourceOption
// thô) để component không cần biết cấu trúc dữ liệu khác nhau giữa 2 nơi gọi
// — caller tự quyết định label có gồm tên chương hay không.
export interface VideoSourceOption {
    /** sourceId của video — dùng làm React key và giá trị chọn. */
    sourceId: number;
    /** Nhãn hiển thị đầy đủ, caller tự dựng (vd. "Chương 1 › http" hoặc chỉ "http"). */
    label: string;
}

export default function VideoSourceDropdown({
    options,
    selectedSourceId,
    onChange,
}: {
    options: VideoSourceOption[];
    selectedSourceId: number;
    onChange: (sourceId: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const selected = options.find(o => o.sourceId === selectedSourceId) ?? options[0];

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                title={selected?.label}
                className="w-full flex items-center justify-between gap-2 pl-3 pr-3 py-2.5 text-xs font-medium border border-ink-borderHi rounded-ink-md bg-ink-panel text-ink-text hover:border-ink-accent focus:outline-none focus:ring-2 focus:ring-ink-accent transition-colors"
            >
                <span className="truncate">{selected?.label}</span>
                <svg
                    className={`w-3.5 h-3.5 text-ink-textDim shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            {open && (
                <div className="absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto rounded-ink-md border border-ink-border bg-ink-panel shadow-ink-md py-1">
                    {options.map((o) => (
                        <button
                            key={o.sourceId}
                            type="button"
                            title={o.label}
                            onClick={() => { onChange(o.sourceId); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                                o.sourceId === selectedSourceId
                                    ? 'bg-ink-accentA text-ink-accent font-semibold'
                                    : 'text-ink-text hover:bg-ink-page'
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
