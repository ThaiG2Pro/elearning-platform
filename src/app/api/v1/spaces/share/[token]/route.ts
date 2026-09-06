import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';

/**
 * Public, no-auth view of a shared space — anonymous visitors following a
 * share link land here (WP1.4). Only ever returns ACTIVE spaces; an
 * archived/unknown token reads as "not found", never a hint that the token
 * existed once.
 */
export async function GET(_request: NextRequest, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    try {
        const controller = new SpaceController();
        const space = await controller.getSpaceByShareToken(params.token);
        // Perf (2026-09-06): public + no-auth → cache được ở CDN/proxy 60s.
        return NextResponse.json(space, {
            headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        if (message === 'SHARE_LINK_NOT_FOUND') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        console.error('Get shared space error:', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
}
