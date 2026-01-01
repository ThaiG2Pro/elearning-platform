import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
    try {
        // Clear the refresh token cookie (BR-SESSION-02: Session Persistence)
        const response = NextResponse.json(
            { message: 'Logged out successfully' },
            { status: 200 }
        );
        response.cookies.set('refreshToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0, // Expire immediately
        });

        return response;
    } catch (error: any) {
        return NextResponse.json(
            { errorCode: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
