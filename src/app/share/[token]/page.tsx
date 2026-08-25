'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import SpacePreview from '@/components/space/SpacePreview';
import { PublicSpace } from '@/types/space.types';
import { User } from '@/types/auth.types';
import { getSharedSpace, copySharedSpace } from '@/lib/spaces';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';

type AppState = 'idle' | 'loading' | 'error' | 'success';

/**
 * WP1.4 — anonymous landing page for a shared space link. Works without
 * login (view-only); "Sao chép về học" clones the space into the visitor's
 * own account, prompting login first if needed.
 */
export default function SharedSpacePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = params.token as string;

    const [space, setSpace] = useState<PublicSpace | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        setUser(AuthUtils.getCurrentUser());
    }, []);

    useEffect(() => {
        const fetchSpace = async () => {
            try {
                setAppState('loading');
                setErrorMessage(null);
                const data = await getSharedSpace(token);
                setSpace(data);
                setAppState('success');
            } catch (error: any) {
                setAppState('error');
                setErrorMessage(error.message);
            }
        };
        if (token) fetchSpace();
    }, [token]);

    // WP1.5.12 — `copying` state alone isn't enough to block a double-fire:
    // the auto-copy effect and a manual click can both read `copying` as
    // false in the same tick (state updates aren't synchronous), so both
    // paths could call copySharedSpace before either commits. A ref is
    // set synchronously and is the real guard; `copying` still drives the
    // disabled/label UI. Backend cloneForOwner is also now idempotent
    // (dedupes by owner+source), so this is belt-and-suspenders.
    const isCopyingRef = useRef(false);

    const handleCopy = useCallback(async () => {
        if (!user) {
            const continueUrl = `/share/${token}?copy=1`;
            router.push(`/join?continueUrl=${encodeURIComponent(continueUrl)}`);
            return;
        }
        if (isCopyingRef.current) return;
        isCopyingRef.current = true;
        try {
            setCopying(true);
            setErrorMessage(null);
            const result = await copySharedSpace(token);
            router.push(`/spaces/${result.spaceId}/learn`);
        } catch (error: any) {
            setErrorMessage(error.message);
            setCopying(false);
            isCopyingRef.current = false;
        }
    }, [user, token, router]);

    // Auto-copy once the visitor returns from login with ?copy=1
    useEffect(() => {
        if (user && searchParams.get('copy') === '1' && appState === 'success' && !isCopyingRef.current) {
            handleCopy();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, appState]);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    };

    const isOwner = !!(user && space?.ownerId && Number(user.id) === space.ownerId);

    const previewState: 'loading' | 'error' | 'ready' =
        appState === 'loading' ? 'loading'
        : appState === 'error' ? 'error'
        : 'ready';

    return (
        <div className="min-h-screen bg-ink-page">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <SpacePreview
                state={previewState}
                errorMessage={errorMessage}
                onBack={() => router.push('/')}
                data={space ? { ...space, isOwner } : undefined}
                badge={space && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${isOwner ? 'bg-ink-accentA text-ink-accent' : 'bg-ink-page text-ink-textMid'}`}>
                        {isOwner ? 'Space của bạn (Đang ở chế độ chia sẻ)' : 'Space được chia sẻ'}
                    </span>
                )}
                cta={space && (
                    <section>
                        {errorMessage && (
                            <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
                        )}
                        {isOwner ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => router.push(`/spaces/${space.id}/learn`)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-ink-accent hover:bg-ink-accent/90 text-white font-medium rounded-lg transition-colors shadow-ink-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Vào học Space này
                                </button>
                                <button
                                    onClick={() => router.push(`/my-spaces/${space.id}/edit`)}
                                    className="inline-flex items-center gap-2 px-6 py-3 border border-ink-border bg-ink-panel hover:bg-ink-page text-ink-text font-medium rounded-lg transition-colors shadow-ink-sm"
                                >
                                    <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Chỉnh sửa Space
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleCopy}
                                disabled={copying}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-ink-accent hover:bg-ink-accent/90 disabled:opacity-60 text-white font-medium rounded-lg transition-colors shadow-ink-sm"
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
                        )}
                    </section>
                )}
            />
        </div>
    );
}
