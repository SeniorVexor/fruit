// app/api/scripts/miner/run-script/route.ts
import { NextRequest } from 'next/server';

const RUNNER_URL = 'http://185.213.11.20:8443/run';
const activeControllers = new Map<string, AbortController>();

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { key, action, continuous = true, taskId = Date.now().toString() } = body;

    if (!key || !action || action < 1 || action > 5) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
    }

    const abortController = new AbortController();
    activeControllers.set(taskId, abortController);

    try {
        // ساخت آرگومان‌های خط فرمان
        const args = ['--key', key, '--action', action.toString()];
        if (continuous) {
            args.push('--continuous');
        }

        // ارسال درخواست به رانر با فرمت جدید
        const response = await fetch(RUNNER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scriptName: 'miner',   // نام اسکریپت مورد نظر
                args: args
            }),
            signal: abortController.signal,
        });

        if (!response.ok) {
            throw new Error(`Runner responded with status ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Runner response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        controller.enqueue(new TextEncoder().encode(chunk));
                    }
                    controller.close();
                } catch (err) {
                    console.error('Stream error:', err);
                    controller.error(err);
                } finally {
                    activeControllers.delete(taskId);
                }
            },
            cancel() {
                abortController.abort();
                activeControllers.delete(taskId);
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        activeControllers.delete(taskId);
        console.error('Runner request failed:', error);
        const errorMessage = `---STREAM---\n${JSON.stringify({ type: 'error', message: error.message })}\n---STREAM_END---\n`;
        return new Response(errorMessage, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (taskId && activeControllers.has(taskId)) {
        const controller = activeControllers.get(taskId);
        controller?.abort();
        activeControllers.delete(taskId);
        return new Response(JSON.stringify({ success: true }));
    }
    return new Response(JSON.stringify({ success: false, error: 'Task not found' }), { status: 404 });
}