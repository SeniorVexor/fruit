import { NextResponse } from 'next/server';
import { TokenManager } from '@/lib/tokenManager';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        // 1. بررسی اعتبار توکن
        const result = await TokenManager.isValidToken(token);

        if (!result.valid || !result.userId) {
            return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
        }

        // 2. موقتاً اشتراک را فعال در نظر می‌گیریم (تا بعداً دیتابیس وصل شود)
        const hasActiveSub = true;

        if (!hasActiveSub) {
            return NextResponse.redirect(new URL('/auth/error/no-subscription', request.url));
        }

        // 3. موفقیت
        return NextResponse.json({
            valid: true,
            userId: result.userId,
            message: "Subscription check bypassed (no database)"
        });

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.redirect(new URL('/auth/error/server-error', request.url));
    }
}