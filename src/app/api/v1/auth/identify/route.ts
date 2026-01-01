import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { IdentifyDto } from '../../../../../modules/auth/dtos/IdentifyDto';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const dto = new IdentifyDto(body.email, body.continueUrl);
        const result = await authController.identify(dto);
        return NextResponse.json(result);
    } catch (error: any) {
        if (error.message === 'INVALID_FORMAT') {
            return NextResponse.json(
                { errorCode: 'INVALID_FORMAT', message: 'Email invalid' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
