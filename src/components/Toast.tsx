'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'info' | 'success' | 'error';
    onClose?: () => void;
    duration?: number; // ms
}

// error/success dùng đỏ/lục ngữ nghĩa trạng thái phổ quát (giống activate,
// error page) — KHÔNG dùng ink-correct/ink-wrong vì token đó chỉ dành cho
// chấm quiz. "info" là loại trung lập/mặc định nên map thẳng vào ink-accent.
const toastConfig = {
    error:   { bg: 'bg-ink-panel border-l-4 border-l-red-500', icon: 'text-red-500', text: 'text-ink-text' },
    success: { bg: 'bg-ink-panel border-l-4 border-l-emerald-500', icon: 'text-emerald-500', text: 'text-ink-text' },
    info:    { bg: 'bg-ink-panel border-l-4 border-l-ink-accent', icon: 'text-ink-accent', text: 'text-ink-text' },
};

const icons = {
    error: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
    ),
    success: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
    ),
    info: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
    ),
};

export default function Toast({ message, type = 'info', onClose, duration = 3500 }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(() => onClose?.(), duration);
        return () => clearTimeout(t);
    }, [onClose, duration]);

    const cfg = toastConfig[type];

    return (
        <div
            className={`fixed right-4 top-20 z-50 w-full max-w-sm ${cfg.bg} rounded-lg shadow-lg border border-ink-border p-4 flex items-start gap-3 animate-in slide-in-from-right-5 duration-300`}
            role="status"
            aria-live="polite"
        >
            <span className={cfg.icon}>{icons[type]}</span>
            <p className={`text-sm leading-relaxed ${cfg.text} flex-1`}>{message}</p>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-ink-textMuted hover:text-ink-text transition-colors ml-1"
                aria-label="Đóng thông báo"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    );
}
