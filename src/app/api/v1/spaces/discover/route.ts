import { NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';

export const dynamic = 'force-dynamic';

// Discovery (2026-09-14) — 4 mục trang chủ guest (showcase / popular / rising /
// latest), xếp hạng phía server. Tách khỏi GET /spaces (giờ chỉ còn phục vụ
// search) để mỗi mục là 1 query đúng định nghĩa thay vì client tự tách 1 list.
export async function GET() {
    try {
        const controller = new SpaceController();
        const discovery = await controller.getDiscovery();

        // Cùng chính sách cache với GET /spaces: public, không phụ thuộc auth.
        return NextResponse.json(discovery, {
            headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        console.error('Get discovery spaces error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
