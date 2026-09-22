import { NextResponse } from 'next/server';
import { SpaceController } from '@/modules/space-management/controllers/SpaceController';

export const dynamic = 'force-dynamic';

// Trang /spaces/tuyen-chon (2026-09-22) — toàn bộ space Tuyển chọn, cùng điều
// kiện lộ diện và cùng thứ tự với mục trên trang chủ (GET /spaces/discover chỉ
// trả 12 đầu). Tách endpoint riêng để trang chủ không phải tải cả danh sách.
export async function GET() {
    try {
        const controller = new SpaceController();
        const spaces = await controller.getAllShowcase();
        return NextResponse.json(spaces, {
            headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        console.error('Get showcase spaces error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
