import { NextResponse } from 'next/server';
import { runScriptSSE } from '@/lib/scriptExecutor';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { initData, scriptName, payload } = body;

        if (!scriptName || !initData) {
            return NextResponse.json({ error: 'scriptName and initData required' }, { status: 400 });
        }

        // Verify Telegram auth
        const { verifyTelegramAuth } = await import('@/lib/telegramVerifier');
        const verification = verifyTelegramAuth(initData);
        if (!verification.valid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const telegramId = BigInt(verification.userId!);

        // Check subscription
        const subscription = await prisma.subscriptions.findUnique({
            where: { user_id: telegramId }
        });

        if (!subscription || subscription.expire_at <= new Date()) {
            return NextResponse.json({ error: 'اشتراک فعال نیست' }, { status: 403 });
        }

        const stream = runScriptSSE(scriptName, payload);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Run script error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}