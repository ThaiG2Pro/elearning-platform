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

        // Security — huỷ session khi đổi/reset mật khẩu: refresh token phát
        // hành trước lần đổi mật khẩu gần nhất (kể cả token bị đánh cắp) bị
        // từ chối ở đây, buộc phải đăng nhập lại bằng mật khẩu mới. Access
        // token 15 phút đang dùng vẫn sống nốt tới hết hạn — accepted vì
        // getRequestContext() không tra DB trên mọi request (xem comment
        // trong UserRepository.invalidateAllTokens).
        if (user.passwordChangedAt && decoded.issuedAt < user.passwordChangedAt) {
            return NextResponse.json(
                { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalidated by password change' },
                { status: 401 }
            );
        }

        // Generate new access token
        const newTokens = TokenFactory.createAuthTokens(user);

        const response = NextResponse.json({
            accessToken: newTokens.accessToken,
            user: {
                id: user.id.toString(),
                email: user.email,
                role: user.role,
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
