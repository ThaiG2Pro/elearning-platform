import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { ChangePasswordDto } from '@/modules/auth/dtos/ChangePasswordDto';

export async function PUT(
    request: NextRequest,
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: ChangePasswordDto = await request.json();

        const controller = new AuthController();
        const result = await controller.changePassword(userId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Change password error:', error);
        let status = 500;
        let message = 'Internal server error';

        if (error instanceof Error) {
            switch (error.message) {
                case 'USER_NOT_FOUND':
                    status = 404;
                    message = 'User not found';
                    break;
                case 'CURRENT_PASSWORD_INVALID':
                    status = 400;
                    message = 'Current password is incorrect';
                    break;
                case 'PASSWORD_CONFIRMATION_MISMATCH':
                    status = 400;
                    message = 'New password and confirmation do not match';
                    break;
                case 'PASSWORD_TOO_WEAK':
                    status = 400;
                    message = 'Password must be at least 8 characters long';
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
