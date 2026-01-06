import { prisma } from '@/lib/prisma';

async function addUser() {
    try {
        const user = await prisma.users.create({
            data: {
                telegram_id: BigInt("123456789"), // ← telegramId
                email: "user@example.com",       // ← ایمیل (اختیاری)
                created_at: new Date(),
            },
        });

        console.log("✅ کاربر اضافه شد:", user);
    } catch (error) {
        console.error('Error adding user:', error);
    }
}

addUser().catch(console.error);