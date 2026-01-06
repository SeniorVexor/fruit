import { NextResponse } from 'next/server';
import { runScriptSSE } from '@/lib/scriptExecutor';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { scriptName, payload } = body;

        if (!scriptName) {
            return NextResponse.json({ error: 'scriptName required' }, { status: 400 });
        }

        // چک وجود فایل
        const fs = require('fs');
        const scriptPath = `./scripts/${scriptName}.py`;
        if (!fs.existsSync(scriptPath)) {
            return NextResponse.json({ error: `Script not found: ${scriptName}.py` }, { status: 404 });
        }

        const stream = runScriptSSE(scriptName, payload ?? {});

        // ✅ ارسال به صورت raw text stream
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Transfer-Encoding': 'chunked', // ✅ مهم برای stream
            },
        });

    } catch (error) {
        console.error('Run script error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}