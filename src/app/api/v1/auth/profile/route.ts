import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/modules/auth/controllers/AuthController';
import { getUserIdFromRequest } from '@/shared/middleware/auth';
import { UpdateProfileDto } from '@/modules/auth/dtos/UpdateProfileDto';

export async function GET(
    request: NextRequest,
): Promise<NextResponse> {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const controller = new AuthController();
        const result = await controller.getProfile(userId);

        // Convert BigInt to string for JSON serialization
        const serializedResult = {
            ...result,
            id: result.id.toString(),
        };

        return NextResponse.json(serializedResult);
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
): Promise<NextResponse> {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: UpdateProfileDto = await request.json();

        const controller = new AuthController();
        const result = await controller.updateProfile(userId, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
