import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { LoginDto } from '../../../../../modules/auth/dtos/LoginDto';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const dto = new LoginDto(body.email, body.password, body.continueUrl);
        const result = await authController.login(dto);

        // Set httpOnly cookie for refresh token (BR-SESSION-02: Session Persistence)
        const response = NextResponse.json(result, { status: 200 });
        response.cookies.set('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
    } catch (error: any) {
        // Don't log stack traces for intentional business errors
        if (error.message === 'VALIDATION_ERROR') {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Invalid input' },
                { status: 400 }
            );
        }
        if (error.message === 'AUTH_FAILED') {
            // Business logic error - wrong password (don't log stack trace)
            return NextResponse.json(
                { code: 'AUTH_FAILED', message: 'Wrong password' },
                { status: 401 }
            );
        }
        if (error.message === 'USER_INACTIVE') {
            return NextResponse.json(
                { code: 'USER_INACTIVE', message: 'Account inactive' },
                { status: 403 }
            );
        }
        // Only log unexpected system errors (bugs, crashes)
        console.error('Login system error:', error);
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
