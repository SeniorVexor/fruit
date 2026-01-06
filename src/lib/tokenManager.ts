import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const TOKEN_DIR = path.join(process.cwd(), 'config/auth/token');
const TOKEN_FILE_PATH = path.join(TOKEN_DIR, 'tokens.json');

interface TokenEntry {
    token: string;
    userId: string;
    createdAt: string;
}

interface TokenFile {
    full: TokenEntry[];
}

export class TokenManager {
    private static async ensureDir(): Promise<void> {
        await fs.mkdir(TOKEN_DIR, { recursive: true });
    }

    private static async readTokens(): Promise<TokenFile> {
        try {
            await this.ensureDir();
            const data = await fs.readFile(TOKEN_FILE_PATH, 'utf-8');
            return JSON.parse(data);
        } catch {
            const initial: TokenFile = { full: [] };
            await this.writeTokens(initial);
            return initial;
        }
    }

    private static async writeTokens(tokens: TokenFile): Promise<void> {
        await this.ensureDir();
        await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2));
    }

    static async isValidToken(token: string): Promise<{ valid: boolean; userId?: string }> {
        const tokens = await this.readTokens();
        const entry = tokens.full.find(t => t.token === token);
        return entry ? { valid: true, userId: entry.userId } : { valid: false };
    }

    static async addToken(token: string, userId: string | number | BigInt): Promise<void> {
        const tokens = await this.readTokens();
        const userIdStr = userId.toString();

        if (!tokens.full.find(t => t.token === token)) {
            tokens.full.push({
                token,
                userId: userIdStr,
                createdAt: new Date().toISOString()
            });
            await this.writeTokens(tokens);
        }
    }

    static async removeToken(token: string): Promise<void> {
        const tokens = await this.readTokens();
        tokens.full = tokens.full.filter(t => t.token !== token);
        await this.writeTokens(tokens);
    }

    static generateToken(): string {
        return crypto.randomUUID();
    }
}