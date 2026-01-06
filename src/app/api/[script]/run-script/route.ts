import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface RouteParams {
    params: Promise<{
        script: string;
    }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
    const { script } = await context.params;
    const scriptName = script;

    const body = await req.json();
    const { key, mode, target } = body;

    const scriptPath = path.join(process.cwd(), 'scripts', `${scriptName}.py`);

    const args = ['python3', '-u', scriptPath, '--key', key];

    if (mode === 'search') {
        if (target) args.push('--name', String(target));
    } else if (mode === 'join') {
        if (target) args.push('--join', String(target));
    }

    console.log(`🚀 Executing: ${scriptPath}`);

    const pythonProcess = spawn(args[0], args.slice(1));
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // --- هندل کردن داده‌هایSTDOUT ---
            pythonProcess.stdout.on('data', (data) => {
                const text = data.toString();

                // ✅ این خط را برای دیباگ اضافه کردم: خروجی را در سرور چاپ می‌کند
                console.log(`[PYTHON STDOUT]: ${text}`);

                controller.enqueue(encoder.encode(text));
            });

            // --- هندل کردن خطاهایSTDERR ---
            pythonProcess.stderr.on('data', (data) => {
                const text = data.toString();

                // ✅ خطاها را هم در سرور چاپ می‌کند
                console.error(`[PYTHON STDERR]: ${text}`);

                controller.enqueue(encoder.encode(`[STDERR]: ${text}`));
            });

            pythonProcess.on('close', (code) => {
                console.log(`🛑 Script closed with code: ${code}`);
                controller.enqueue(encoder.encode(`\n[EXIT] Script finished with code ${code}\n`));
                controller.close();
            });

            pythonProcess.on('error', (err) => {
                console.error(`❌ FATAL Error: ${err.message}`);
                controller.enqueue(encoder.encode(`[FATAL]: ${err.message}\n`));
                controller.close();
            });
        },
        cancel() {
            pythonProcess.kill();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-transform',
        },
    });
}