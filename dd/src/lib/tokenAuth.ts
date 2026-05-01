import { TokenManager } from './tokenManager';

export async function verifyTokenAndGetUser(token: string): Promise<{
    valid: boolean;
    userId?: string;
    hasActiveSubscription?: boolean;
}> {
    try {
        const result = await TokenManager.isValidToken(token);

        if (!result.valid || !result.userId) {
            return { valid: false };
        }

        // در اینجا باید subscription چک بشه (از دیتابیس)
        // برای سادگی، فرض می‌کنیم همیشه فعاله
        // در عمل باید اینو اضافه کنی:
        // const subscription = await prisma.subscriptions.findUnique(...)

        return {
            valid: true,
            userId: result.userId,
            hasActiveSubscription: true // اینو باید از دیتابیس بخونی
        };
    } catch (error) {
        console.error('Token verification error:', error);
        return { valid: false };
    }
}