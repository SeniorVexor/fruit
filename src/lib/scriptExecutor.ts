import { spawn, ChildProcess } from 'child_process';
import { Readable } from 'stream';

export const PROCESSES = new Map<string, { process: ChildProcess; startTime: number }>();

export function runScriptSSE(scriptName: string, payload: Record<string, unknown>): Readable {
    const scriptPath = `./scripts/${scriptName}.py`;

    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found: ${scriptPath}`);
    }

    const stream = new Readable({
        read() {} // پوش ریدر ساده
    });

    const pythonProcess = spawn('python3', [
        '-u',
        scriptPath,
        '--config',
        JSON.stringify(payload)
    ]);

    PROCESSES.set(scriptName, { process: pythonProcess, startTime: Date.now() });

    pythonProcess.stdout.on('data', (data: Buffer) => {
        stream.push(data);
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
        stream.push(data);
    });

    pythonProcess.on('close', (code: number) => {
        stream.push(`\n✅ Script completed with code ${code}\n`);
        stream.push(null);
        PROCESSES.delete(scriptName);
    });

    pythonProcess.on('error', (err: Error) => {
        stream.push(`❌ Error: ${err.message}\n`);
        stream.push(null);
        PROCESSES.delete(scriptName);
    });

    return stream;
}

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