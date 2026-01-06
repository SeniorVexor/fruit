import { NextResponse } from 'next/server';
import { supabase, supabaseAuth } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { TokenManager } from '@/lib/tokenManager';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: 'OAuth code required' }, { status: 400 });
        }

        const { data, error } = await supabaseAuth.auth.exchangeCodeForSession(code);

        if (error || !data.user) {
            return NextResponse.json({ error: 'Invalid OAuth code' }, { status: 401 });
        }

        const user = data.user;
        const userId = user.id;
        const email = user.email!;

        // کاربر
        let dbUser = await prisma.users.findUnique({
            where: { tgId: userId }  // یا هر فیلدی که مناسب هست
        });

        if (!dbUser) {
            dbUser = await prisma.users.create({
                data: { email }
            });
        }

        // Subscription
        let subscription = await prisma.subscriptions.findUnique({
            where: { user_id: BigInt(userId) }
        });

        if (!subscription) {
            subscription = await prisma.subscriptions.create({
                data: {
                    user_id: BigInt(userId),
                    expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        }

        // Token
        const token = TokenManager.generateToken();
        await TokenManager.addToken(token, userId);

        return NextResponse.json({
            success: true,
            token,
            userId,
            email,
            hasActiveSubscription: subscription.expire_at > new Date()
        });

    } catch (error) {
        console.error('OAuth error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}