// src/proxy.ts (یا middleware.ts در ریشه پروژه)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TokenManager } from '@/lib/tokenManager';

export const config = {
    matcher: [
        '/',                           // block root
        '/auth',
        '/auth/token/:token/:path*',   // all protected routes
    ],
};

interface CacheEntry {
    allowed: boolean;
    redirectTo?: string;
    expires: number;
}
const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5000;

async function validateAccess(path: string, token?: string): Promise<{ allowed: boolean; redirectTo?: string }> {
    const cacheKey = token ? `${path}|${token}` : path;
    const now = Date.now();
    const cached = validationCache.get(cacheKey);
    if (cached && cached.expires > now) {
        return { allowed: cached.allowed, redirectTo: cached.redirectTo };
    }

    try {
        const apiUrl = new URL('/api/validate-access', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, token }),
        });
        const data = await response.json();
        const result = {
            allowed: data.allowed === true,
            redirectTo: data.redirectTo,
        };
        validationCache.set(cacheKey, {
            allowed: result.allowed,
            redirectTo: result.redirectTo,
            expires: now + CACHE_TTL,
        });
        return result;
    } catch (error) {
        console.error('Validation API call failed:', error);
        // در صورت خطای شبکه، دسترسی را رد نکنید (fail open) یا می‌توانید fail close کنید
        return { allowed: true };
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // مسیرهای خطا را بدون بررسی عبور دهید (جلوگیری از حلقه)
    if (pathname.startsWith('/auth/error')) {
        return NextResponse.next();
    }

    // استخراج توکن از مسیرهای محافظت‌شده
    const tokenMatch = pathname.match(/^\/auth\/token\/([^/]+)/);
    const token = tokenMatch ? tokenMatch[1] : undefined;

    // 1. بررسی دسترسی سطح بالا (از طریق API validate-access که قوانین کلی را اعمال می‌کند)
    const validation = await validateAccess(pathname, token);
    if (!validation.allowed) {
        const redirectUrl = validation.redirectTo || '/auth/error/access-denied';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 2. اگر مسیر شامل توکن است، اعتبار توکن را بررسی کن
    if (token) {
        try {
            const { valid, userId } = await TokenManager.isValidToken(token);
            if (!valid) {
                return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
            }

            // توکن معتبر است – درخواست را ادامه بده و کوکی را تنظیم کن
            const response = NextResponse.next();

            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 روز
                path: '/',
            });

            if (userId) {
                response.headers.set('x-user-id', userId);
            }

            return response;
        } catch (error) {
            console.error('Proxy Token Verification Error:', error);
            return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
        }
    }

    // برای مسیرهایی مثل /auth که توکن ندارند اما اعتبارسنجی اولیه قبول شده
    return NextResponse.next();
}



