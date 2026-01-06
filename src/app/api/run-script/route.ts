import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { runScriptSSE, PROCESSES } from '@/lib/scriptExecutor';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { scriptName, payload } = body;

        if (!scriptName || typeof scriptName !== 'string') {
            return new Response('Invalid scriptName', { status: 400 });
        }

        if (!payload || typeof payload !== 'object') {
            return new Response('Invalid payload', { status: 400 });
        }

        // Kill existing process if running
        if (PROCESSES.has(scriptName)) {
            console.log(`Killing existing process for ${scriptName}`);
            const existing = PROCESSES.get(scriptName);
            existing?.process.kill('SIGTERM');
            PROCESSES.delete(scriptName);
        }

        // ✅ Convert Node.js stream to web stream
        const nodeStream = runScriptSSE(scriptName, payload);
        const webStream = Readable.toWeb(nodeStream);

        return new Response(webStream as ReadableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Accel-Buffering': 'no',
            },
        });
    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}