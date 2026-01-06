import {prisma} from '@/lib/prisma';

async function addSubscription() {
    await prisma.subscriptions.create({
        data: {
            user_id: BigInt("123456789"), // ← userId تو token
            expire_at: new Date('2025-12-31'),
            created_at: new Date(),
        },
    });
    console.log("✅ اشتراک اضافه شد");
}

addSubscription().catch(console.error);