import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

// WP1.5.11 — self-service data export. The last item open in the WP1.5
// core-product-debt audit's "xoá tài khoản/export dữ liệu" pair; account
// deletion already shipped (WP1.5.6). Returns everything deletion doesn't
// erase — profile, owned spaces (full chapter/lesson/question tree),
// learning progress, notes — as a downloadable JSON file. UserDataExportDto
// already converts every BigInt/Date to a plain string, so this can go
// straight to JSON.stringify without a custom replacer.
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const controller = new AuthController();
        const data = await controller.exportUserData(userId);

        return new NextResponse(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="du-lieu-cua-toi-${userId}.json"`,
            },
        });
    } catch (error) {
        console.error('Export data error:', error);
        let status = 500;
        let message = 'Internal server error';

        if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
            status = 404;
            message = 'User not found';
        }

        return NextResponse.json({ error: message }, { status });
    }
}
