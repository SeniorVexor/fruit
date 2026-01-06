// app/api/kill-script/route.ts
import { NextResponse } from 'next/server';
import { killScript, PROCESSES } from '@/lib/scriptExecutor';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { scriptName } = body;

        if (!scriptName) {
            return NextResponse.json({ error: 'scriptName required' }, { status: 400 });
        }

        const success = killScript(scriptName);
        return NextResponse.json({
            success,
            status: success ? 'killed' : 'not found',
            activeProcesses: Array.from(PROCESSES.keys()) // لیست پروسه‌های فعال
        });

    } catch (error) {
        console.error('Kill script error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}