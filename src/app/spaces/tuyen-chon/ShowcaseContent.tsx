'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Header from '@/components/Header';
import SpaceList from '@/components/SpaceList';
import { getShowcaseSpaces } from '@/lib/spaces';
import { Space } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type LoadState = 'loading' | 'success' | 'error';

// Trang /spaces/tuyen-chon (2026-09-22) — nơi nút "Xem tất cả N" của mục
// Tuyển chọn trên trang chủ dẫn tới. Trang chủ giữ 12 card để không đè 2 mục
// Phổ biến / Mới nổi; ở đây hiện đủ, thứ tự giống trang chủ (server xếp theo
// showcase_order). Danh sách nhỏ (vài chục) nên tải 1 lần, lọc theo tên ngay
// trên client — chưa chia chủ đề vì schema chưa có cột tag.
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();

export default function ShowcaseContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [state, setState] = useState<LoadState>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        setUser(AuthUtils.getCurrentUser());
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getShowcaseSpaces();
                if (cancelled) return;
                setSpaces(data);
                setState('success');
            } catch (error: any) {
                if (cancelled) return;
                setErrorMessage(error.message);
                setState('error');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return spaces;
        return spaces.filter(s => normalize(`${s.title} ${s.description ?? ''}`).includes(q));
    }, [spaces, query]);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    };

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-ink-text leading-tight">Space tuyển chọn</h1>
                        <p className="text-[13.5px] text-ink-textMuted mt-1">
                            Do đội ngũ chọn tay: nội dung đầy đủ, bài học theo thứ tự.
                            {state === 'success' && ` ${spaces.length} Space, xếp theo lượt xem trên YouTube.`}
                        </p>
                    </div>
                    <label className="relative block w-full sm:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-textMuted" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Lọc theo tên: Python, Docker, React..."
                            aria-label="Lọc Space tuyển chọn theo tên"
                            className="vd-focusable w-full h-10 pl-9 pr-3 rounded-ink-md border border-ink-border bg-ink-panel text-[14px] text-ink-text placeholder:text-ink-textMuted"
                        />
                    </label>
                </div>

                {state === 'error' ? (
                    <div className="py-12 text-center text-[14px] text-destructive">{errorMessage}</div>
                ) : (
                    <SpaceList
                        spaces={filtered}
                        loading={state === 'loading'}
                        skeletonCount={9}
                        hideShowcaseBadge
                        onSpaceClick={(id) => router.push(`/spaces/${id}`)}
                        emptyMessage={query ? `Không có Space nào khớp "${query}".` : 'Chưa có Space tuyển chọn nào.'}
                    />
                )}
            </main>
        </div>
    );
}
