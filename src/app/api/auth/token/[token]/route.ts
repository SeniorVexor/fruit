import { NextResponse } from 'next/server';
import { TokenManager } from '@/lib/tokenManager';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        // 1. بررسی اعتبار توکن
        const result = await TokenManager.isValidToken(token);

        if (!result.valid || !result.userId) {
            // اگر توکن اشتباه بود -> ردایرکت به صفحه invalid-token
            return NextResponse.redirect(new URL('/auth/error/invalid-token', request.url));
        }

        // 2. بررسی اشتراک در دیتابیس
        // فرض بر این است که userId از TokenManager به صورت BigInt یا String می‌آید
        // توجه: در Prisma معمولا BigInt برمی‌گرداند، باید مطمئن شویم تطابق دارد

        let subscription = null;

        try {
            subscription = await prisma.subscriptions.findUnique({
                where: { user_id: BigInt(result.userId) }
            });











        } catch (dbError) {
            console.error("DB Error:", dbError);
            // اگر در اتصال دیتابیس مشکلی بود، به صفحه ارور برود
            return NextResponse.redirect(new URL('/auth/error/server-error', request.url));
        }

        // 3. بررسی وضعیت اشتراک
        const now = new Date();
        const hasActiveSub = subscription && subscription.expire_at > now;

        if (!hasActiveSub) {
            // اگر اشتراک ندارد یا منقضی شده است -> ردایرکت به no-subscription
            return NextResponse.redirect(new URL('/auth/error/no-subscription', request.url));
        }

        // 4. اگر همه چیز اوکی بود -> جیسون موفقیت برمی‌گرداند (یا می‌توانید به داشبورد ردایرکت کنید)
        return NextResponse.json({
            valid: true,
            userId: result.userId,
            expiresAt: subscription?.expire_at
        });

    } catch (error) {
        console.error('Verification error:', error);
        // در صورت خطای عمومی -> ردایرکت به server-error
        return NextResponse.redirect(new URL('/auth/error/server-error', request.url));
    }
}