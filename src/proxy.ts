// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TokenManager } from '@/lib/tokenManager';

export const config = {
    matcher: '/auth/token/:token/:path*',
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const match = pathname.match(/^\/auth\/token\/([^/]+)/);

    if (!match) {
        return NextResponse.redirect(new URL('/auth/error/invalid', request.url));
    }

    const token = match[1];

    try {
        const result = await TokenManager.isValidToken(token);

        if (!result.valid) {
            return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
        }

        const response = NextResponse.next();

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
        });

        if (result.userId) {
            response.headers.set('x-user-id', result.userId);
        }

        return response;

    } catch (error) {
        console.error('Proxy Token Verification Error:', error);
        return NextResponse.redirect(new URL('/auth/error/invalid', request.url));
    }
}