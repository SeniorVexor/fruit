import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const TOKENS_DIR = path.join(process.cwd(), 'config/auth/tokens');

export interface TokenData {
    token: string;
    userId: string;
    createdAt: string;
    allowedPaths: string[];
}

export class TokenManager {
    private static async ensureDir(): Promise<void> {
        await fs.mkdir(TOKENS_DIR, { recursive: true });
    }

    private static async readTokenFile(token: string): Promise<TokenData | null> {
        try {
            await this.ensureDir();
            const filePath = path.join(TOKENS_DIR, `${token}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    private static async writeTokenFile(token: string, data: TokenData): Promise<void> {
        await this.ensureDir();
        const filePath = path.join(TOKENS_DIR, `${token}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    // بررسی اعتبار توکن (وجود فایل و انطباق token داخل فایل با نام فایل)
    static async isValidToken(token: string): Promise<{ valid: boolean; userId?: string; allowedPaths?: string[] }> {
        const data = await this.readTokenFile(token);
        if (data && data.token === token) {
            return { valid: true, userId: data.userId, allowedPaths: data.allowedPaths };
        }
        return { valid: false };
    }

    // دریافت مجوزهای توکن
    static async getAllowedPaths(token: string): Promise<string[] | null> {
        const data = await this.readTokenFile(token);
        return data?.allowedPaths ?? null;
    }

    // ساخت توکن جدید و ذخیره در فایل جداگانه
    static async createToken(userId: string, allowedPaths: string[] = []): Promise<string> {
        const token = crypto.randomUUID();
        const tokenData: TokenData = {
            token,
            userId,
            createdAt: new Date().toISOString(),
            allowedPaths,
        };
        await this.writeTokenFile(token, tokenData);
        return token;
    }

    // به‌روزرسانی مجوزهای توکن
    static async updateAllowedPaths(token: string, allowedPaths: string[]): Promise<boolean> {
        const data = await this.readTokenFile(token);
        if (!data) return false;
        data.allowedPaths = allowedPaths;
        await this.writeTokenFile(token, data);
        return true;
    }

    // حذف توکن
    static async removeToken(token: string): Promise<void> {
        try {
            const filePath = path.join(TOKENS_DIR, `${token}.json`);
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Error deleting token ${token}:`, error);
        }
    }

    // (اختیاری) تبدیل از فرمت قدیمی tokens.json به فایل‌های جدید
    static async migrateFromOldFormat(oldFilePath: string): Promise<void> {
        try {
            const content = await fs.readFile(oldFilePath, 'utf-8');
            const { full } = JSON.parse(content);
            for (const entry of full) {
                const existing = await this.readTokenFile(entry.token);
                if (!existing) {
                    await this.writeTokenFile(entry.token, {
                        token: entry.token,
                        userId: entry.userId,
                        createdAt: entry.createdAt,
                        allowedPaths: [], // مقدار پیش‌فرض
                    });
                }
            }
            console.log('Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }
}