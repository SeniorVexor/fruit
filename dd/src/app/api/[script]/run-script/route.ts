import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { access } from 'fs/promises';

const SCRIPT_NAME = "cardTransfer";
const EXECUTION_TIMEOUT = 60000;

function toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// تبدیل کلیدهای فرانت‌اند به آرگومان‌های پایتون
const KEY_MAPPING: Record<string, string> = {
    'sellerKey': 'seller',
    'buyerKey': 'buyer',
    'baseId': 'base-id',
    'action': 'action'
};

export async function POST(req: NextRequest) {
    let body: Record<string, any>;

    try {
        body = await req.json();
        console.log('[API] Received body:', body);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', SCRIPT_NAME, "main.py");

    try {
        await access(scriptPath);
        console.log('[API] Script found:', scriptPath);
    } catch {
        return NextResponse.json({ error: 'Script file missing at ' + scriptPath }, { status: 404 });
    }

    // ساخت آرگومان‌ها با توجه به action
    const args: string[] = [];

    // اگر action=list باشد، فقط seller-key را می‌فرستیم
    if (body.action === 'list') {
        if (body.sellerKey) {
            args.push('--seller', String(body.sellerKey));
        }
    } else {
        // حالت transfer
        for (const [key, value] of Object.entries(body)) {
            if (value === null || value === undefined || value === '') continue;
            if (key === 'action') continue; // action را پاس نمی‌دهیم، چون اسکریپت از base-id وجود تشخیص می‌دهد

            const flag = KEY_MAPPING[key] || toKebabCase(key);
            const strValue = String(value);

            if (strValue.length > 1000) continue;

            args.push(`--${flag}`, strValue);
        }
    }

    console.log(`🚀 Executing: python3 -u ${scriptPath} ${args.join(' ')}`);

    const encoder = new TextEncoder();

    return new Promise<Response>((resolve) => {
        let controller: ReadableStreamDefaultController;
        let timeoutId: NodeJS.Timeout;
        let isClosed = false;

        const python = spawn('python3', ['-u', scriptPath, ...args], {
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',
                PYTHONDONTWRITEBYTECODE: '1'
            },
            detached: false
        });

        // مدیریت تایم‌اوت
        timeoutId = setTimeout(() => {
            if (!isClosed) {
                controller.enqueue(encoder.encode('\n[SYSTEM] Execution timeout after 60s\n'));
                python.kill('SIGKILL');
                isClosed = true;
                controller.close();
            }
        }, EXECUTION_TIMEOUT);

        const stream = new ReadableStream({
            start(ctrl) {
                controller = ctrl;

                // stdout
                python.stdout.on('data', (data) => {
                    if (!isClosed) {
                        const text = data.toString();
                        console.log('[PYTHON STDOUT]:', text.substring(0, 200));
                        controller.enqueue(encoder.encode(text));
                    }
                });

                // stderr
                python.stderr.on('data', (data) => {
                    if (!isClosed) {
                        const text = data.toString();
                        console.error('[PYTHON STDERR]:', text);
                        controller.enqueue(encoder.encode(`[STDERR] ${text}`));
                    }
                });

                // بسته شدن پروسه
                python.on('close', (code) => {
                    console.log(`[PYTHON] Process closed with code ${code}`);
                    clearTimeout(timeoutId);
                    if (!isClosed) {
                        controller.enqueue(encoder.encode(`\n[SYSTEM] Process finished with code ${code}\n`));
                        isClosed = true;
                        controller.close();
                    }
                });

                // خطای اسپawn
                python.on('error', (err) => {
                    console.error('[PYTHON] Spawn error:', err);
                    clearTimeout(timeoutId);
                    if (!isClosed) {
                        controller.enqueue(encoder.encode(`\n[ERROR] Failed to start python: ${err.message}\n`));
                        isClosed = true;
                        controller.close();
                    }
                });

                // لغو از سمت کلاینت
                req.signal.addEventListener('abort', () => {
                    console.log('[API] Client aborted request');
                    clearTimeout(timeoutId);
                    if (!python.killed) {
                        python.kill('SIGTERM');
                        setTimeout(() => {
                            if (!python.killed) python.kill('SIGKILL');
                        }, 3000);
                    }
                });
            },
            cancel() {
                clearTimeout(timeoutId);
                if (!python.killed) {
                    python.kill('SIGTERM');
                    setTimeout(() => {
                        if (!python.killed) python.kill('SIGKILL');
                    }, 3000);
                }
            }
        });

        resolve(new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        }));
    });
}
