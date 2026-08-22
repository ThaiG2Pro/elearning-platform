import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { DeleteAccountDto } from '@/modules/auth/dtos/DeleteAccountDto';

// WP1.5.6 — account deletion. Soft delete only: hard-deleting would violate
// RESTRICT foreign keys on owned spaces/notes for basically any real
// account (see UserEntity.markDeleted for the full rationale).
export async function DELETE(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: DeleteAccountDto = await request.json();

        const controller = new AuthController();
        const result = await controller.deleteAccount(userId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Delete account error:', error);
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
                    message = 'Password is incorrect';
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
