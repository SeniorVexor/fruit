// app/api/token-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface TokenPermission {
    token: string;
    userId: string;
    createdAt: string;
    allowedPaths: string[];
}

// پوشه اصلی پروژه
const TOKENS_DIR = path.join(process.cwd(), 'config', 'auth', 'tokens');

// اعتبارسنجی فرمت UUID ساده (برای جلوگیری از path traversal)
function isValidTokenFormat(token: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
}

// خواندن فایل توکن و بازگرداندن شیء مجوزها
async function getTokenPermission(token: string): Promise<TokenPermission | null> {
    if (!isValidTokenFormat(token)) {
        return null;
    }
    const filePath = path.join(TOKENS_DIR, `${token}.json`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent) as TokenPermission;
        // اطمینان از منطبق بودن توکن داخل فایل با نام فایل
        if (data.token !== token) {
            return null;
        }
        return data;
    } catch (error) {
        console.error(`Error reading token file for ${token}:`, error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, token, path: checkPath } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid token' },
                { status: 400 }
            );
        }

        const tokenData = await getTokenPermission(token);
        if (!tokenData) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 404 }
            );
        }

        // --- نوع درخواست: list -> بازگرداندن لیست allowedPaths ---
        if (type === 'list') {
            return NextResponse.json({
                allowedPaths: tokenData.allowedPaths,
            });
        }

        // --- نوع درخواست: check -> بررسی دسترسی به مسیر مشخص ---
        if (type === 'check') {
            if (!checkPath || typeof checkPath !== 'string') {
                return NextResponse.json(
                    { error: 'Missing path for check type' },
                    { status: 400 }
                );
            }

            const isAllowed = tokenData.allowedPaths.some(
                (allowed) => allowed === checkPath  // تطابق کامل (می‌توانید به prefix یا regex تغییر دهید)
            );

            if (isAllowed) {
                return NextResponse.json({ allowed: true });
            } else {
                return NextResponse.json({
                    allowed: false,
                    redirectTo: '/auth/error/access-denied',
                });
            }
        }

        // نوع ناشناخته
        return NextResponse.json(
            { error: 'Invalid type. Use "list" or "check".' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Token access API error:', error);
        return NextResponse.json(
            { allowed: false, redirectTo: '/auth/error/server-error' },
            { status: 500 }
        );
    }
}