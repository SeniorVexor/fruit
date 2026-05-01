// app/api/miner/run-script/route.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { NextRequest } from 'next/server';
import fs from 'fs';

const activeProcesses = new Map<string, ChildProcess>();

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { key, action, continuous = true, taskId = Date.now().toString() } = body;

    if (!key || !action || action < 1 || action > 5) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts','miner','main.py');

    if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found at ${scriptPath}`);
        return new Response(JSON.stringify({ error: 'Script not found' }), { status: 500 });
    }

    const pythonProcess = spawn('uv', [
        'run',
        scriptPath,
        '--key', key,
        '--action', action.toString(),
        ...(continuous ? ['--continuous'] : [])
    ], { shell: true });

    activeProcesses.set(taskId, pythonProcess);

    let controllerClosed = false;
    let closeTimeout: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        start(controller) {
            const safeEnqueue = (chunk: Uint8Array) => {
                if (!controllerClosed) {
                    try {
                        controller.enqueue(chunk);
                    } catch (err) {
                        // Controller might be closed already
                        console.error('Failed to enqueue chunk:', err);
                    }
                }
            };

            const safeClose = () => {
                if (controllerClosed) return;
                controllerClosed = true;
                if (closeTimeout) clearTimeout(closeTimeout);
                try {
                    controller.close();
                } catch (err) {
                    console.error('Failed to close controller:', err);
                }
            };

            // Force close after a safety timeout (e.g., 30 seconds after process exit)
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    const errorChunk = Buffer.from(`---STREAM---\n${JSON.stringify({ type: 'error', message: `Process exited with code ${code}` })}\n---STREAM_END---\n`);
                    safeEnqueue(errorChunk);
                }
                // Give a short delay for any pending stdout chunks
                closeTimeout = setTimeout(safeClose, 100);
                activeProcesses.delete(taskId);
            });

            pythonProcess.on('error', (err) => {
                const errorChunk = Buffer.from(`---STREAM---\n${JSON.stringify({ type: 'error', message: `Process error: ${err.message}` })}\n---STREAM_END---\n`);
                safeEnqueue(errorChunk);
                safeClose();
                activeProcesses.delete(taskId);
            });

            pythonProcess.stdout.on('data', (data) => {
                safeEnqueue(data);
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data.toString()}`);
                const errorMessage = Buffer.from(`---STREAM---\n${JSON.stringify({ type: 'stderr', message: data.toString() })}\n---STREAM_END---\n`);
                safeEnqueue(errorMessage);
            });
        },
        cancel() {
            // Client aborted the request
            controllerClosed = true;
            if (pythonProcess && !pythonProcess.killed) {
                pythonProcess.kill('SIGTERM');
            }
            activeProcesses.delete(taskId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (taskId && activeProcesses.has(taskId)) {
        const proc = activeProcesses.get(taskId);
        if (proc && !proc.killed) {
            proc.kill('SIGTERM');
        }
        activeProcesses.delete(taskId);
        return new Response(JSON.stringify({ success: true }));
    }
    return new Response(JSON.stringify({ success: false, error: 'Task not found' }), { status: 404 });
}