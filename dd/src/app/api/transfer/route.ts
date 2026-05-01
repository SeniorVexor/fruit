import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import {ErrorCode} from "@/types/script/transfer";

interface TransferResponse {
    success: boolean;
    error_code?: ErrorCode | string | null;
    message?: string;
    data?: any;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // اعتبارسنجی اولیه با return کد خطا
        if (!body.seller || !body.buyer || !body.mode || body.target === undefined) {
            return NextResponse.json<TransferResponse>({
                success: false,
                error_code: 'VAL_001'
            }, { status: 400 });
        }

        if (body.mode !== 'base_id' && body.mode !== 'single_id') {
            return NextResponse.json<TransferResponse>({
                success: false,
                error_code: 'VAL_002'
            }, { status: 400 });
        }

        const args: string[] = [
            '--seller', body.seller,
            '--buyer', body.buyer,
        ];

        const isBaseId = body.mode === 'base_id';
        const hasCount = body.count !== undefined && body.count !== null;

        if (isBaseId) {
            args.push('--base-id', body.target.toString());
            if (hasCount) {
                if (body.count < 1) {
                    return NextResponse.json<TransferResponse>({
                        success: false,
                        error_code: 'VAL_003'
                    }, { status: 400 });
                }
                args.push('--count', body.count.toString());
            }
        } else {
            args.push('--ids', body.target.toString());
        }

        const scriptPath = path.join(process.cwd(), 'scripts', 'transfer', 'main.py');

        // اگر base_id بدون count است: فقط Check (غیر استریمینگ)
        // اجرای اسکریپت برای Check (بازگشت JSON کامل)
        if (isBaseId && !hasCount) {
            const result = await executeCheckScript(scriptPath, args);

            // اگه اسکریپت خطا برگردونده
            if (!result.success && result.error_code) {
                return NextResponse.json<TransferResponse>({
                    success: false,
                    error_code: result.error_code,
                    data: result.summary || {}
                }, { status: getHttpStatus(result.error_code) });
            }

            // استخراج کارت‌ها
            const cards = result.summary?.cards || [];
            console.log(cards);
            // اگه کارت موجود نباشه (AVL_001)
            if (cards.length === 0) {
                return NextResponse.json<TransferResponse>({
                    success: false,
                    error_code: 'AVL_001',
                    message: 'هیچ کارتی برای این Base ID در حساب فروشنده یافت نشد'
                }, { status: 404 });
            }

            return NextResponse.json<TransferResponse>({
                success: true,
                data: {
                    base_id: body.target,
                    cards: cards,
                    totalAvailable: result.total_available || cards.length
                }
            });
        }

        // در غیر این صورت: اجرای انتقال با استریمینگ
        return executeTransferStream(scriptPath, args);

    } catch (error) {
        return NextResponse.json<TransferResponse>({
            success: false,
            error_code: 'SYS_001',
            message: error instanceof Error ? error.message : 'Internal error'
        }, { status: 500 });
    }
}

function getHttpStatus(errorCode: string): number {
    const map: Record<string, number> = {
        'VAL_001': 400, 'VAL_002': 400, 'VAL_003': 400,
        'AVL_001': 404,
        'SYS_001': 500, 'SYS_002': 500, 'SYS_005': 500,
        'SYS_003': 409,  // Conflict: Another online session
        'SYS_004': 403,
        'TRF_001': 500
    };
    return map[errorCode] || 500;
}

// اجرای اسکریپت برای Check (بازگشت JSON کامل)
function executeCheckScript(scriptPath: string, args: string[]): Promise<any> {
    return new Promise((resolve) => {
        const pythonProcess = spawn('python3', [scriptPath, ...args]);
        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                let output = stdout;

                // استخراج JSON از خروجی (با در نظر گرفتن marker ها)
                if (stdout.includes('---RESULT_END---')) {
                    output = stdout.split('---RESULT_END---')[0];
                }
                if (stdout.includes('---RESULT_START---')) {
                    output = stdout.split('---RESULT_START---')[1] || output;
                }

                const firstBrace = output.indexOf('{');
                const lastBrace = output.lastIndexOf('}');

                if (firstBrace === -1 || lastBrace === -1) {
                    resolve({
                        success: false,
                        error_code: 'SYS_002',
                        message: 'No JSON found in output'
                    });
                    return;
                }

                const jsonStr = output.substring(firstBrace, lastBrace + 1);
                const data = JSON.parse(jsonStr);
                resolve(data);
            } catch (e) {
                resolve({
                    success: false,
                    error_code: 'SYS_002',
                    message: 'Parse error: ' + (e as Error).message
                });
            }
        });

        pythonProcess.on('error', (err) => {
            resolve({
                success: false,
                error_code: 'SYS_001',
                message: err.message
            });
        });
    });
}

// اجرای انتقال با استریمینگ Real-time
function executeTransferStream(scriptPath: string, args: string[]): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const sendEvent = (event: any) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
                } catch (e) {
                    // استریم بسته شده
                }
            };

            let buffer = '';
            let resultBuffer = '';
            let isCollectingResult = false;

            const pythonProcess = spawn('python3', [scriptPath, ...args]);

            // پردازش stdout (لاگ‌ها و نتیجه نهایی)
            pythonProcess.stdout.on('data', (data) => {
                const chunk = data.toString();

                // تشخیص marker شروع نتیجه
                if (chunk.includes('---RESULT_START---')) {
                    isCollectingResult = true;
                    const parts = chunk.split('---RESULT_START---');
                    if (parts[0]) processLogBuffer(parts[0]);
                    resultBuffer += parts[1] || '';
                }
                // تشخیص marker پایان نتیجه
                else if (chunk.includes('---RESULT_END---')) {
                    const parts = chunk.split('---RESULT_END---');
                    resultBuffer += parts[0] || '';

                    // پارس نتیجه نهایی
                    try {
                        const firstBrace = resultBuffer.indexOf('{');
                        const lastBrace = resultBuffer.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1) {
                            const jsonStr = resultBuffer.substring(firstBrace, lastBrace + 1);
                            const result = JSON.parse(jsonStr);
                            sendEvent({
                                type: 'complete',
                                result: {
                                    success_count: result.success_count || 0,
                                    fail_count: result.fail_count || 0,
                                    total: result.total || (result.success_count || 0) + (result.fail_count || 0),
                                    seller_gold_before: result.seller_gold_before,
                                    seller_gold_after: result.seller_gold_after
                                }
                            });
                        }
                    } catch (e) {
                        sendEvent({
                            type: 'error',
                            code: 'SYS_002',
                            message: 'Failed to parse final result'
                        });
                    }

                    isCollectingResult = false;
                    if (parts[1]) processLogBuffer(parts[1]);
                }
                // در حال جمع‌آوری JSON نتیجه
                else if (isCollectingResult) {
                    resultBuffer += chunk;
                }
                // لاگ معمولی
                else {
                    processLogBuffer(chunk);
                }
            });

            // پردازش stderr (معمولاً خطاها و لاگ‌های warning)
            pythonProcess.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach((line: string) => {
                    if (line.trim()) {
                        sendEvent({
                            type: 'log',
                            message: line.trim(),
                            logType: detectLogType(line)
                        });
                    }
                });
            });

            function processLogBuffer(text: string) {
                buffer += text;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // نگه داشتن خط ناقص

                lines.forEach(line => {
                    if (line.trim()) {
                        sendEvent({
                            type: 'log',
                            message: line.trim(),
                            logType: detectLogType(line)
                        });
                    }
                });
            }

            function detectLogType(line: string): 'info' | 'error' | 'success' | 'warning' {
                const lower = line.toLowerCase();
                if (lower.includes('[error]') || lower.includes('✗') || lower.includes('failed') || lower.includes('خطا')) return 'error';
                if (lower.includes('[success]') || lower.includes('✓') || lower.includes('successful') || lower.includes('موفق')) return 'success';
                if (lower.includes('[warning]') || lower.includes('⚠') || lower.includes('warn')) return 'warning';
                return 'info';
            }

            pythonProcess.on('close', (code) => {
                // ارسال باقیمانده بافر
                if (buffer.trim()) {
                    sendEvent({
                        type: 'log',
                        message: buffer.trim(),
                        logType: 'info'
                    });
                }

                if (code !== 0 && code !== null) {
                    sendEvent({
                        type: 'error',
                        code: 'TRF_001',
                        message: `Process exited with code ${code}`
                    });
                }

                controller.close();
            });

            pythonProcess.on('error', (err) => {
                sendEvent({
                    type: 'error',
                    code: 'SYS_001',
                    message: 'Failed to start Python: ' + err.message
                });
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}