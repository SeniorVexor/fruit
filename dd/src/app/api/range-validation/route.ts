// app/api/range-validation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BLOCKLIST_FILE = path.join(process.cwd(), 'data', 'blocklist.json');

// Ensure the data directory and file exist
async function ensureBlocklistFile() {
    const dir = path.dirname(BLOCKLIST_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    try {
        await fs.access(BLOCKLIST_FILE);
    } catch {
        await fs.writeFile(BLOCKLIST_FILE, JSON.stringify({ patterns: [] }, null, 2));
    }
}

async function readBlocklist() {
    await ensureBlocklistFile();
    const content = await fs.readFile(BLOCKLIST_FILE, 'utf-8');
    return JSON.parse(content);
}

async function writeBlocklist(data: any) {
    await ensureBlocklistFile();
    await fs.writeFile(BLOCKLIST_FILE, JSON.stringify(data, null, 2));
}

// GET /api/range-validation - return current blocklist
export async function GET() {
    try {
        const data = await readBlocklist();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to read blocklist:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/range-validation - add or remove patterns
// Body: { action: "add", pattern: "/admin" } or { action: "remove", pattern: "/admin" }
// Pattern can be a string or a regex string (starts and ends with '/', e.g., '/^\\/admin/')
export async function POST(req: NextRequest) {
    try {
        const { action, pattern } = await req.json();
        if (!action || !pattern) {
            return NextResponse.json({ error: 'Missing action or pattern' }, { status: 400 });
        }

        const data = await readBlocklist();
        let patterns = data.patterns || [];

        if (action === 'add') {
            if (!patterns.includes(pattern)) {
                patterns.push(pattern);
            }
        } else if (action === 'remove') {
            patterns = patterns.filter((p: string) => p !== pattern);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        data.patterns = patterns;
        await writeBlocklist(data);
        return NextResponse.json({ success: true, patterns });
    } catch (error) {
        console.error('Failed to update blocklist:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/range-validation?pattern=/admin - remove a pattern
export async function DELETE(req: NextRequest) {
    const pattern = req.nextUrl.searchParams.get('pattern');
    if (!pattern) {
        return NextResponse.json({ error: 'Missing pattern' }, { status: 400 });
    }
    try {
        const data = await readBlocklist();
        data.patterns = data.patterns.filter((p: string) => p !== pattern);
        await writeBlocklist(data);
        return NextResponse.json({ success: true, patterns: data.patterns });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}