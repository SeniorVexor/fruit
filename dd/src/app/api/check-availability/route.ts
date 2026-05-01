// app/api/check-availability/route.ts
import { spawn } from 'child_process';
import path from 'path';

// Helper function برای اجرای Python و دریافت نتیجه (non-streaming)
function execPython(scriptPath: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [scriptPath, ...args], {
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                FORCE_COLOR: '0', // رنگ‌ها رو غیرفعال می‌کنیم چون لازم نیست
            }
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
            stdout += data.toString('utf-8');
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
            stderr += data.toString('utf-8');
        });

        pythonProcess.on('close', (code: number | null) => {
            if (code !== 0) {
                reject(new Error(`Python process failed with code ${code}: ${stderr}`));
                return;
            }

            try {
                // پیدا کردن JSON در خروجی (آخرین خط معتبر)
                const lines = stdout.split('\n').filter(line => line.trim());
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if ((line.startsWith('{') && line.includes('summary')) ||
                        (line.startsWith('['))) {
                        try {
                            resolve(JSON.parse(line));
                            return;
                        } catch {
                            continue;
                        }
                    }
                }
                // اگر JSON پیدا نشد
                resolve({ raw_output: stdout, success: true });
            } catch (e) {
                reject(new Error(`Failed to parse output: ${e}`));
            }
        });

        pythonProcess.on('error', (err: Error) => {
            reject(err);
        });
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { seller, buyer, mode, target } = body;

        // اعتبارسنجی
        if (!seller || !buyer || !target || !mode) {
            return Response.json(
                { error: 'Missing required fields: seller, buyer, mode, target' },
                { status: 400 }
            );
        }

        // ساخت args (مشابه API اصلی ولی بدون count)
        const args: string[] = [
            '--seller', seller.toString(),
            '--buyer', buyer.toString(),
        ];

        if (mode === 'base_id') {
            args.push('--base-id', target.toString());
            // آپشنال: اگر می‌خواهید فقط چک کند و انتقال ندهد
            // args.push('--dry-run');
        } else if (mode === 'single_id') {
            args.push('--ids', target.toString());
        } else {
            return Response.json({ error: 'Invalid mode' }, { status: 400 });
        }

        const scriptPath = path.join(process.cwd(), 'scripts', 'transfer.py');
        const result = await execPython(scriptPath, args);

        // استخراج اطلاعات موجودی از نتیجه
        return Response.json({
            success: true,
            available: result.success || false,
            total_available: result.summary?.total ||
                result.summary?.total_available ||
                result.transfers?.length || 0,
            cards_preview: result.cards_preview || result.transfers || [],
            price_per_card: result.summary?.price || 0,
            estimated_total_cost: result.summary?.total_gold || null
        });

    } catch (error: any) {
        console.error('Check availability error:', error);
        return Response.json(
            {
                success: false,
                available: false,
                error: error.message || 'Internal server error'
            },
            { status: 500 }
        );
    }
}
