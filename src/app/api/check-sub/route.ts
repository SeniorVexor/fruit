import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTelegramAuth } from '@/lib/telegramVerifier';
import { TokenManager } from '@/lib/tokenManager';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { initData, userId, token } = body;

        let targetUserId: string | null = null;

        // مورد 1: احراز با initData (تلگرام)
        if (initData) {
            const verification = verifyTelegramAuth(initData);
            if (!verification.valid || !verification.userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            targetUserId = verification.userId;
        }
        // مورد 2: احراز با توکن
        else if (token) {
            const result = await TokenManager.isValidToken(token);
            if (!result.valid || !result.userId) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
            targetUserId = result.userId;
        }
        // مورد 3: احراز با userId مستقیم
        else if (userId) {
            targetUserId = userId;
        }
        // هیچ‌کدام
        else {
            return NextResponse.json({ error: 'initData, token, or userId required' }, { status: 400 });
        }

        // چک اشتراک از دیتابیس
        // const subscription = await prisma.subscriptions.findUnique({
        //     where: { user_id: BigInt(targetUserId) }
        // });

        // const hasActive = subscription && subscription.expire_at > new Date();

        // return NextResponse.json({ status: hasActive ? 'ok' : 'no_subscription' });

    } catch (error) {
        console.error('Check subscription error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}