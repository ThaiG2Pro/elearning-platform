import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '../../../../../modules/auth/repositories/UserRepository';
import { TokenFactory } from '../../../../../modules/auth/domain/TokenFactory';

const userRepository = new UserRepository();

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get('refreshToken')?.value;
        if (!refreshToken) {
            return NextResponse.json(
                { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' },
                { status: 401 }
            );
        }

        // Validate refresh token
        const decoded = TokenFactory.verifyRefreshToken(refreshToken);
        if (!decoded) {
            return NextResponse.json(
                { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
                { status: 401 }
            );
        }

        const userId = decoded.userId;

        // Find user
        const user = await userRepository.findById(userId);
        if (!user) {
            return NextResponse.json(
                { code: 'USER_NOT_FOUND', message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is still active (BR-ID-02)
        if (!user.isActive()) {
            return NextResponse.json(
                { code: 'USER_INACTIVE', message: 'Account inactive' },
                { status: 403 }
            );
        }

        // Generate new access token
        const newTokens = TokenFactory.createAuthTokens(user);

        const response = NextResponse.json({
            accessToken: newTokens.accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.roleName,
                fullName: user.fullName,
            },
        }, { status: 200 });

        // Optionally refresh the refresh token cookie
        response.cookies.set('refreshToken', newTokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
    } catch (error: any) {
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
