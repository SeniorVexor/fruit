// در یک فایل temp.js
import {TokenManager} from '@/lib/tokenManager';
import {prisma} from '@/lib/prisma';

async function createTestToken() {
    const token = TokenManager.generateToken();
    await TokenManager.addToken(token, "123456789"); // user_id تست
    console.log("Test token:", token);
}
createTestToken();