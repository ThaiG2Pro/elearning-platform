import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '../../../../../modules/auth/controllers/AuthController';
import { ActivateDto } from '../../../../../modules/auth/dtos/ActivateDto';

const authController = new AuthController();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const dto = new ActivateDto(body.token);
        const result = await authController.activate(dto);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        if (error.message === 'TOKEN_INVALID') {
            return NextResponse.json(
                { code: 'TOKEN_EXPIRED', message: 'Link expired' },
                { status: 410 }
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
