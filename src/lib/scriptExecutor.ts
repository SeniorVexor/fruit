import { spawn, ChildProcess } from 'child_process';
import { Readable } from 'stream';

export const PROCESSES = new Map<string, { process: ChildProcess; startTime: number }>();

export function runScriptSSE(scriptName: string, payload: Record<string, unknown>) {
    const scriptPath = `./scripts/${scriptName}.py`;

    // چک کردن وجود فایل
    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found: ${scriptPath}`);
    }

    const stream = new Readable({
        read() {} // پوش ریدر ساده
    });

    // ✅ اجرای پایتون با -u (unbuffered)
    const pythonProcess = spawn('python3', [
        '-u',
        scriptPath,
        '--config', // ← اضافه شد
        JSON.stringify(payload)
    ]);

    // ✅ ذخیره پروسه برای kill
    PROCESSES.set(scriptName, { process: pythonProcess, startTime: Date.now() });

    // ✅ ارسال stdout به صورت خام و فوری
    pythonProcess.stdout.on('data', (data: Buffer) => {
        stream.push(data); // فوراً push می‌کنیم، بدون فرمت JSON
    });

    // ✅ ارسال stderr هم به صورت خام
    pythonProcess.stderr.on('data', (data: Buffer) => {
        stream.push(data);
    });

    // ✅ پایان stream
    pythonProcess.on('close', (code: number) => {
        stream.push(`\n✅ Script completed with code ${code}\n`);
        stream.push(null); // پایان stream
        PROCESSES.delete(scriptName);
    });

    pythonProcess.on('error', (err: Error) => {
        stream.push(`❌ Error: ${err.message}\n`);
        stream.push(null);
        PROCESSES.delete(scriptName);
    });

    return stream;
}

// ✅ تابع kill
export function killScript(scriptName: string): boolean {
    const scriptProcess = PROCESSES.get(scriptName);
    if (!scriptProcess) return false;

    const killed = scriptProcess.process.kill('SIGTERM');
    if (killed) {
        PROCESSES.delete(scriptName);
        console.log(`✅ Process ${scriptName} killed`);
    }

    return killed;
}