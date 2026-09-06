import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { RegisterDto } from '../../../../../modules/auth/dtos/RegisterDto';
import { applyRateLimit, getClientIp, AUTH_RATE_LIMITS } from '../../../../../shared/middleware/rateLimit';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const limited = applyRateLimit([
            { bucket: 'register:ip', key: getClientIp(request), ...AUTH_RATE_LIMITS.registerPerIp },
        ]);
        if (limited) return limited;

        const dto = new RegisterDto(body.email, body.password, body.fullName, body.age, body.continueUrl);
        const result = await authController.register(dto);
        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        if (error.message === 'VALIDATION_ERROR') {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Password weak / Name too short' },
                { status: 400 }
            );
        }
        if (error.message === 'INVALID_AGE') {
            return NextResponse.json(
                { code: 'INVALID_AGE', message: 'Age must be a positive number' },
                { status: 400 }
            );
        }
        if (error.message === 'USER_ALREADY_ACTIVE') {
            return NextResponse.json(
                { code: 'USER_ALREADY_ACTIVE', message: 'User already active' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
