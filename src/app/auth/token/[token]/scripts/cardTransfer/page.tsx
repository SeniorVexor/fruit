'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader, StopCircle, RefreshCw, LogOut, Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type LogEntry = {
    type: string;
    message?: string;
    card_start?: any;
    card_result?: any;
    report?: any;
    error?: string;
};

export default function CardTransferPage() {
    const params = useParams();
    const token = params.token as string;

    const [step, setStep] = useState(1);
    const [sellerKey, setSellerKey] = useState('');
    const [buyerKey, setBuyerKey] = useState('');
    const [power, setPower] = useState<number>(1);
    const [count, setCount] = useState<number>(1);
    const [maxBids, setMaxBids] = useState<number>(7);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = (entry: LogEntry) => {
        setLogs(prev => [...prev, entry]);
    };

    const stopTransfer = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsRunning(false);
        addLog({ type: 'info', message: '⏹️ عملیات متوقف شد.' });
    };

    const startTransfer = async () => {
        if (isRunning) stopTransfer();
        setLogs([]);
        setIsRunning(true);
        addLog({ type: 'info', message: '🚀 شروع انتقال کارت‌ها...' });

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('/api/scripts/cardTransfer/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sellerKey, buyerKey, power, count, maxBids }),
                signal: abortController.signal,
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value);

                    let startIdx = buffer.indexOf('---STREAM---');
                    let endIdx = buffer.indexOf('---STREAM_END---');

                    while (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                        const jsonStr = buffer.substring(startIdx + 12, endIdx).trim();
                        buffer = buffer.substring(endIdx + 14);
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.type === 'card_start') {
                                addLog({ type: 'card_start', message: `🃏 کارت ${data.index}/${data.total} (power ${data.power}) - ID: ${data.card_id}` });
                            } else if (data.type === 'card_result') {
                                const status = data.success ? '✅ موفق' : '❌ ناموفق';
                                addLog({ type: 'card_result', message: `${status} - ${data.message}` });
                            } else if (data.type === 'info') {
                                addLog({ type: 'info', message: data.message });
                            } else if (data.type === 'error') {
                                addLog({ type: 'error', message: `❌ خطا: ${data.message}` });
                                setIsRunning(false);
                                abortController.abort();
                                return;
                            } else if (data.type === 'end') {
                                const r = data.report;
                                addLog({ type: 'info', message: `🏁 گزارش نهایی: موفق: ${r.success}, ناموفق: ${r.lost}, مزاحمان: ${r.interferers?.length || 0}` });
                                addLog({ type: 'info', message: `💰 طلای فروشنده: ${r.seller_gold}, طلای خریدار: ${r.buyer_gold}` });
                                setIsRunning(false);
                            }
                        } catch (e) {
                            console.error('Parse error', e);
                        }
                        startIdx = buffer.indexOf('---STREAM---');
                        endIdx = buffer.indexOf('---STREAM_END---');
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                addLog({ type: 'info', message: '⏸️ عملیات توسط کاربر متوقف شد.' });
            } else {
                addLog({ type: 'error', message: `❌ خطا: ${error.message}` });
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    const handleStart = () => {
        if (!sellerKey || !buyerKey || power <= 0 || count <= 0) {
            addLog({ type: 'error', message: 'لطفاً تمام مقادیر را به درستی وارد کنید.' });
            return;
        }
        startTransfer();
    };

    const handleReset = () => {
        setStep(1);
        setLogs([]);
        stopTransfer();
    };

    if (!isHydrated) {
        return <div className="flex justify-center items-center h-screen">در حال بارگذاری...</div>;
    }

    return (
        <div className="p-4 font-sans w-full">
            <div className="mx-auto max-w-4xl">
                {step === 1 ? (
                    <div className="card bg-base-100 shadow-xl max-w-md mx-auto">
                        <div className="card-body items-center text-center">
                            <div className="p-4 bg-primary/10 rounded-full mb-4">
                                <Wallet className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="card-title text-2xl">انتقال کارت</h2>
                            <p className="text-sm text-gray-500 mb-4">کلیدهای بازیابی فروشنده و خریدار را وارد کنید</p>
                            <input
                                type="text"
                                placeholder="کلید فروشنده"
                                className="input input-bordered w-full mb-3 font-mono"
                                value={sellerKey}
                                onChange={(e) => setSellerKey(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="کلید خریدار"
                                className="input input-bordered w-full mb-4 font-mono"
                                value={buyerKey}
                                onChange={(e) => setBuyerKey(e.target.value)}
                            />
                            <button
                                className="btn btn-primary w-full"
                                disabled={!sellerKey || !buyerKey}
                                onClick={() => setStep(2)}
                            >
                                ادامه <ArrowRight className="w-4 h-4 mr-2" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="card bg-base-100 shadow-sm p-4 flex flex-wrap justify-between items-center gap-2">
                            <div className="text-sm font-mono truncate">فروشنده: {sellerKey.slice(0,8)}... | خریدار: {buyerKey.slice(0,8)}...</div>
                            <div className="flex gap-2">
                                <button className="btn btn-outline btn-error btn-sm" onClick={stopTransfer} disabled={!isRunning}>
                                    <StopCircle className="w-4 h-4" /> توقف
                                </button>
                                <button className="btn btn-outline btn-warning btn-sm" onClick={handleReset}>
                                    <RefreshCw className="w-4 h-4" /> تغییر کلیدها
                                </button>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title gap-2">
                                    <TrendingUp className="w-6 h-6 text-success" />
                                    تنظیمات انتقال
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-control">
                                        <label className="label">قدرت کارت</label>
                                        <input type="number" className="input input-bordered" value={power} onChange={(e) => setPower(Number(e.target.value))} />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">تعداد کارت</label>
                                        <input type="number" className="input input-bordered" value={count} onChange={(e) => setCount(Number(e.target.value))} />
                                    </div>
                                    <div className="form-control col-span-2">
                                        <label className="label">حداکثر بید (پیشنهاد)</label>
                                        <input type="number" className="input input-bordered" value={maxBids} onChange={(e) => setMaxBids(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="card-actions justify-end mt-4">
                                    <button className="btn btn-primary w-full" onClick={handleStart} disabled={isRunning}>
                                        {isRunning ? <Loader className="animate-spin w-5 h-5" /> : "شروع انتقال"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-inner">
                            <div className="card-body p-4">
                                <h3 className="font-mono text-sm flex items-center gap-2">Live Log</h3>
                                <div className="bg-black/80 text-green-400 font-mono text-xs p-3 rounded-box h-64 overflow-y-auto" ref={logContainerRef}>
                                    {logs.length === 0 && <div className="text-gray-500">در انتظار شروع عملیات...</div>}
                                    {logs.map((log, idx) => (
                                        <div key={idx} className={log.type === 'error' ? 'text-red-400' : 'text-gray-300'}>
                                            {log.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Link href="../dash" className="w-full btn btn-ghost items-center justify-center gap-3 rounded-box border-2 border-base-100 bg-base-200 px-4 py-3 my-3 text-sm font-medium">
                <ArrowRight className="w-4 h-4 rotate-180" />
                بازگشت به خانه
            </Link>
        </div>
    );
}