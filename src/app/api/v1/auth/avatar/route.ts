import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateAvatarDto } from '@/modules/auth/dtos/UpdateAvatarDto';

// WP1.5.6 — real avatar upload (client resizes to a small data: URL before
// sending, see profile/page.tsx).
export async function PUT(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: UpdateAvatarDto = await request.json();

        const controller = new AuthController();
        const result = await controller.updateAvatar(userId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Update avatar error:', error);
        let status = 500;
        let message = 'Internal server error';

        if (error instanceof Error) {
            switch (error.message) {
                case 'USER_NOT_FOUND':
                    status = 404;
                    message = 'User not found';
                    break;
                case 'INVALID_AVATAR':
                    status = 400;
                    message = 'Invalid avatar image';
                    break;
                case 'AVATAR_TOO_LARGE':
                    status = 400;
                    message = 'Avatar image is too large';
                    break;
                case 'VALIDATION_ERROR':
                    status = 400;
                    message = 'Invalid input data';
                    break;
            }
        }

        return NextResponse.json({ error: message }, { status });
    }
}
