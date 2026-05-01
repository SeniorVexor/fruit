// src/proxy.ts
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
        return { allowed: true }; // fail open
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Extract token if present (for routes that include a token)
    const tokenMatch = pathname.match(/^\/auth\/token\/([^/]+)/);
    const token = tokenMatch ? tokenMatch[1] : undefined;

    // 1. Always check validation API (even for paths without a token)
    const validation = await validateAccess(pathname, token);
    if (!validation.allowed) {
        const redirectUrl = validation.redirectTo || '/auth/error/access-denied';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // 2. If this is a token‑protected route, validate the token
    if (token) {
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
            return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
        }
    }

    // For non‑token routes (like /auth), if validation passed, just proceed
    // (you may want to render a page or redirect elsewhere)
    return NextResponse.next();
}