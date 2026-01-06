import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TokenManager } from '@/lib/tokenManager';
import { verifyTelegramAuth } from '@/lib/telegramVerifier';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { initData } = body;

        if (!initData) {
            return NextResponse.json({ error: 'initData required' }, { status: 400 });
        }

        const verification = verifyTelegramAuth(initData);
        if (!verification.valid || !verification.userId) {
            return NextResponse.json({ error: 'Invalid Telegram auth' }, { status: 401 });
        }

        const telegramId = BigInt(verification.userId);

        // کاربر
        let user = await prisma.users.findUnique({
            where: { telegram_id: telegramId }
        });

        if (!user) {
            user = await prisma.users.create({
                data: { telegram_id: telegramId }
            });
        }

        // Subscription
        let subscription = await prisma.subscriptions.findUnique({
            where: { user_id: telegramId }
        });

        if (!subscription) {
            subscription = await prisma.subscriptions.create({
                data: {
                    user_id: telegramId,
                    expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        }

        // Token
        const token = TokenManager.generateToken();
        await TokenManager.addToken(token, telegramId);

        return NextResponse.json({
            success: true,
            token,
            telegramId: telegramId.toString(),
            hasActiveSubscription: subscription.expire_at > new Date()
        });

    } catch (error) {
        console.error('Telegram auth error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}