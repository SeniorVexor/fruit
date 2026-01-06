import crypto from 'crypto';

export function verifyTelegramAuth(initData: string): { valid: boolean; userId?: string } {
    try {
        const token = process.env.BOT_TOKEN!;
        if (!token) throw new Error('BOT_TOKEN not set');

        const secretKey = crypto.createHash('sha256').update(token).digest();

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return { valid: false };

        params.delete('hash');
        params.sort();

        const dataCheckString = Array.from(params.entries())
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        const isValid = calculatedHash === hash;

        if (isValid) {
            const userId = params.get('id');
            return { valid: true, userId: userId || undefined };
        }

        return { valid: false };
    } catch {
        return { valid: false };
    }
}