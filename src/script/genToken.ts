// scripts/test-token.ts
import { TokenManager } from '@/lib/tokenManager';

async function createTestToken() {
    // ساخت توکن تست با userId دلخواه و دسترسی‌های اولیه (مثلاً ['miner', 'transfer'])
    const token = await TokenManager.createToken('123456789', []);
    console.log('Test token created successfully:');
    console.log('Token:', token);
    console.log('You can now use this token in URLs like:');
    console.log(`/auth/token/${token}`);
    console.log(`/auth/token/${token}/scripts/miner`);
}

createTestToken().catch(console.error);