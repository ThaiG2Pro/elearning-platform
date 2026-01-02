'use client';

import { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'info' | 'success' | 'error';
    onClose?: () => void;
    duration?: number; // ms
}

export default function Toast({ message, type = 'info', onClose, duration = 3500 }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(() => onClose && onClose(), duration);
        return () => clearTimeout(t);
    }, [onClose, duration]);

    const bg = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700';

    return (
        <div className={`fixed right-4 top-6 z-50 max-w-sm w-full ${bg} border rounded-md shadow-lg p-3`} role="status" aria-live="polite">
            <div className="text-sm">{message}</div>
        </div>
    );
}
