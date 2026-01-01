import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { ResetDto } from '../../../../../modules/auth/dtos/ResetDto';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Support both "password" and "newPassword" for backward compatibility
        const password = body.password || body.newPassword;
        const dto = new ResetDto(body.token, password);
        const result = await authController.reset(dto);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        if (error.message === 'VALIDATION_ERROR') {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Invalid input' },
                { status: 400 }
            );
        }
        if (error.message === 'PASSWORD_TOO_SHORT') {
            return NextResponse.json(
                { code: 'PASSWORD_TOO_WEAK', message: 'Password must be at least 6 characters' },
                { status: 422 }
            );
        }
        if (error.message === 'TOKEN_INVALID') {
            return NextResponse.json(
                { code: 'TOKEN_INVALID', message: 'Token expired or invalid' },
                { status: 400 }
            );
        }
        if (error.message === 'USER_NOT_FOUND') {
            return NextResponse.json(
                { code: 'USER_NOT_FOUND', message: 'User not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
