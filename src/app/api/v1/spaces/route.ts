import { NextRequest, NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || undefined;

        const controller = new SpaceController();
        const spaces = await controller.getSpaces(search);

        // Perf (2026-09-06): endpoint public, không phụ thuộc auth → cho
        // CDN/reverse proxy (Cloudflare/Caddy/Nginx) cache 60s. Browser vẫn
        // luôn revalidate (max-age=0) để search thấy kết quả mới.
        return NextResponse.json(spaces, {
            headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        console.error('Get spaces error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
