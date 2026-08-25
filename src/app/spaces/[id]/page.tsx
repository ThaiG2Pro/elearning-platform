'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useCallback } from 'react';
import Header from '@/components/Header';
import SpacePreview from '@/components/space/SpacePreview';
import { SpaceDetail, Companion } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { getSpaceDetail, copySharedSpace, getCompanions } from '@/lib/spaces';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'processing' | 'error' | 'success';

export default function SpaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const spaceId = parseInt(params.id as string);

    const [space, setSpace] = useState<SpaceDetail | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copying, setCopying] = useState(false);
    const [companions, setCompanions] = useState<Companion[]>([]);

    const isCopyingRef = useRef(false);

    // Fetch space detail on mount
    useEffect(() => {
        const fetchSpace = async () => {
            try {
                setAppState('loading');
                setErrorMessage(null);
                const data = await getSpaceDetail(spaceId);
                setSpace(data);
                setAppState('success');
            } catch (error: any) {
                setAppState('error');
                setErrorMessage(error.message);
            }
        };

        if (Number.isNaN(spaceId)) {
            setAppState('error');
            setErrorMessage('Đường dẫn Space không hợp lệ.');
            return;
        }

        fetchSpace();
    }, [spaceId]);

    // WP1.7 — "cùng học": only fetch once we know the caller owns a space
    // in this lineage (companions is a lineage-member-only view, not a
    // public leaderboard), so we don't fire it for a space we can't see yet.
    useEffect(() => {
        if (!space?.isOwner) {
            setCompanions([]);
            return;
        }
        getCompanions(spaceId).then(setCompanions);
    }, [spaceId, space?.isOwner]);

    // Load user from token on mount
    useEffect(() => {
        const currentUser = AuthUtils.getCurrentUser();
        setUser(currentUser);
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
            setUser(null);
        } catch (error: any) {
            setUser(null);
        }
    };

    const handleJoin = () => {
        const continueUrl = `/spaces/${spaceId}?copy=1`;
        router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
    };

    const handleBack = () => {
        router.push('/');
    };

    const handleLearn = () => {
        router.push(`/spaces/${spaceId}/learn`);
    };

    const handleEdit = () => {
        router.push(`/my-spaces/${spaceId}/edit`);
    };

    const handleCopy = useCallback(async () => {
        if (!user) {
            const continueUrl = `/spaces/${spaceId}?copy=1`;
            router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
            return;
        }
        if (!space?.shareToken || space.isOwner) return;
        if (isCopyingRef.current) return;
        isCopyingRef.current = true;
        try {
            setCopying(true);
            setErrorMessage(null);
            const result = await copySharedSpace(space.shareToken);
            router.push(`/spaces/${result.spaceId}/learn`);
        } catch (error: any) {
            setErrorMessage(error.message);
            setCopying(false);
            isCopyingRef.current = false;
        }
    }, [user, spaceId, space?.shareToken, space?.isOwner, router]);

    // Auto-copy once the visitor returns from login with ?copy=1 (only if caller is not the owner)
    useEffect(() => {
        if (user && searchParams.get('copy') === '1' && appState === 'success' && !isCopyingRef.current && space && !space.isOwner) {
            handleCopy();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, appState, space]);

    // appState (5 trạng thái nội bộ) → 3 state trình bày của SpacePreview.
    const previewState: 'loading' | 'error' | 'ready' =
        appState === 'loading' ? 'loading'
        : appState === 'error' && errorMessage ? 'error'
        : 'ready';

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={handleJoin} />

            <SpacePreview
                state={previewState}
                errorMessage={errorMessage}
                onBack={handleBack}
                data={space ?? undefined}
                badge={space && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 border border-ink-border ${space.isOwner ? 'bg-ink-page text-ink-textMid' : 'bg-ink-accentA text-ink-accent'}`}>
                        {space.isOwner ? 'Space của bạn' : 'Space của người dùng khác'}
                    </span>
                )}
                infoExtra={space?.isOwner && typeof space.completionRate === 'number' && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-ink-textMuted mb-1">
                            <span>Tiến độ học của bạn</span>
                            <span className="font-medium text-ink-textMid">{space.completionRate}%</span>
                        </div>
                        <div className="w-full h-2 bg-ink-page rounded-full overflow-hidden">
                            <div
                                className="h-full bg-ink-accent rounded-full transition-all"
                                style={{ width: `${space.completionRate}%` }}
                            />
                        </div>
                    </div>
                )}
                aside={companions.length > 0 && (
                    // WP1.7 — Companions: who else is learning this space's clone
                    // lineage, read-only, lineage-scoped.
                    <section className="bg-ink-panel border border-ink-border rounded-ink-md p-6 shadow-ink-sm mb-6">
                        <h2 className="text-sm font-semibold text-ink-text mb-3">Cùng học</h2>
                        <ul className="space-y-3">
                            {companions.map((companion) => (
                                <li key={companion.spaceId} className="flex items-center gap-3">
                                    <span className="flex-1 text-sm text-ink-text truncate">
                                        {companion.name}
                                        {companion.isSelf && (
                                            <span className="text-ink-textMuted"> (Bạn)</span>
                                        )}
                                    </span>
                                    <div className="w-28 h-1.5 bg-ink-page rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-ink-accent rounded-full transition-all"
                                            style={{ width: `${companion.completionRate}%` }}
                                        />
                                    </div>
                                    <span className="w-10 text-right text-xs font-medium text-ink-textMuted">
                                        {companion.completionRate}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                cta={space && (
                    <section>
                        {!user ? (
                            <button
                                onClick={handleJoin}
                                className="inline-flex items-center gap-2 px-6 py-3 vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white font-medium rounded-lg transition-colors shadow-ink-sm"
                            >
                                Tham gia để học
                            </button>
                        ) : space.isOwner ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleLearn}
                                    className="inline-flex items-center gap-2 px-6 py-3 vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white font-medium rounded-lg transition-colors shadow-ink-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    {typeof space.completionRate === 'number' && space.completionRate > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}
                                </button>
                                <button
                                    onClick={handleEdit}
                                    className="inline-flex items-center gap-2 px-6 py-3 border border-ink-border bg-ink-panel hover:bg-ink-page text-ink-text font-medium rounded-lg transition-colors shadow-ink-sm"
                                >
                                    <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Chỉnh sửa Space
                                </button>
                            </div>
                        ) : space.shareToken ? (
                            <button
                                onClick={handleCopy}
                                disabled={copying}
                                className="inline-flex items-center gap-2 px-6 py-3 vd-focusable bg-ink-accent hover:bg-ink-accent/90 disabled:opacity-60 text-white font-medium rounded-lg transition-colors shadow-ink-sm"
                            >
                                {copying ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Đang sao chép…
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                        Sao chép về học
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <p className="text-sm text-ink-textMuted bg-ink-page rounded-lg px-4 py-3">
                                    Đây là Space của người dùng khác.
                                </p>
                                <button
                                    onClick={handleBack}
                                    className="px-4 py-2 border border-ink-border bg-ink-panel hover:bg-ink-page text-ink-text text-sm font-medium rounded-lg transition-colors"
                                >
                                    Khám phá Space khác
                                </button>
                            </div>
                        )}
                    </section>
                )}
            />
        </div>
    );
}
