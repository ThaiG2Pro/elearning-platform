import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { ForgotDto } from '../../../../../modules/auth/dtos/ForgotDto';
import { applyRateLimit, getClientIp, normaliseEmailKey, AUTH_RATE_LIMITS } from '../../../../../shared/middleware/rateLimit';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const emailKey = normaliseEmailKey(body.email);
        const limited = applyRateLimit([
            { bucket: 'forgot:ip', key: getClientIp(request), ...AUTH_RATE_LIMITS.forgotPerIp },
            ...(emailKey ? [{ bucket: 'forgot:email', key: emailKey, ...AUTH_RATE_LIMITS.forgotPerEmail }] : []),
        ]);
        if (limited) return limited;

        const dto = new ForgotDto(body.email);
        const result = await authController.forgot(dto);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        if (error.message === 'VALIDATION_ERROR') {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Invalid email' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
