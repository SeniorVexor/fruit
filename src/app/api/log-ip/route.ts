import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'logs', 'ips.json');

async function ensureLogFile() {
    const dir = path.dirname(LOG_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    try {
        await fs.access(LOG_FILE);
    } catch {
        await fs.writeFile(LOG_FILE, JSON.stringify({}, null, 2));
    }
}

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        // استخراج IP از هدرها (بدون استفاده از request.ip)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
            || request.headers.get('x-real-ip')
            || 'unknown';

        await ensureLogFile();
        const content = await fs.readFile(LOG_FILE, 'utf-8');
        const data = JSON.parse(content);

        if (!data[token]) data[token] = { ips: [] };
        if (!data[token].ips.includes(ip)) {
            data[token].ips.push(ip);
            await fs.writeFile(LOG_FILE, JSON.stringify(data, null, 2));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('IP logging error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}