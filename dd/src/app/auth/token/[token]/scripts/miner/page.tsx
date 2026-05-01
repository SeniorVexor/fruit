'use client';

import { useState, useRef, useEffect } from 'react';
import { Key, ArrowRight, Pickaxe, Loader2, Database, Trophy, StopCircle, RefreshCw, LogOut, Loader } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ScriptNotAvailablePage from '@/app/auth/error/script-not-available/page';

type LogEntry = {
    type: string;
    cycle?: number;
    collected_gold?: number;
    player_gold?: number;
    mining_rate_per_hour?: number;
    overflow_seconds?: number;
    message?: string;
    seconds_left?: number;
    action?: any;
};

const ActionSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="form-control w-full">
        <label className="label">
            <span className="label-text">اقدام پس از جمع‌آوری طلا</span>
        </label>
        <select className="select select-bordered w-full mt-2" value={value} onChange={(e) => onChange(Number(e.target.value))}>
            <option value={1}>اهدا به قبیله (حداقل ۱۰۰ طلا)</option>
            <option value={2}>واریز به بانک (تا سقف مخزن)</option>
            <option value={3}>خرید پک کریستال (۳ میلیون طلا)</option>
            <option value={4}>خرید پک هیولا (۲.۵ میلیون طلا)</option>
            <option value={5}>هیچ کاری نکن</option>
        </select>
    </div>
);

export default function MinerPage() {
    // ========== ALL HOOKS (MUST BE AT TOP) ==========
    const [step, setStep] = useState(1);
    const [restoreKey, setRestoreKey] = useState('');
    const [selectedAction, setSelectedAction] = useState(5);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentCycle, setCurrentCycle] = useState<LogEntry | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const [config, setConfig] = useState<any>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [isHydrated, setIsHydrated] = useState(false);  // <-- declared here

    const params = useParams();
    const token = params.token as string;

    // ========== EFFECTS ==========
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        fetch('/api/scripts-config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(err => {
                console.error('Failed to load config', err);
                setConfig({});
            })
            .finally(() => setLoadingConfig(false));
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // ========== EARLY RETURNS (after all hooks) ==========
    if (loadingConfig) {
        return <div className="flex justify-center items-center h-screen">در حال بارگذاری...</div>;
    }

    if (!config?.miner?.available) {
        return <ScriptNotAvailablePage />;
    }

    // ========== HANDLERS ==========
    const addLog = (entry: LogEntry) => {
        setLogs(prev => [...prev, entry]);
    };

    const stopMining = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsRunning(false);
        addLog({ type: 'info', message: '⏹️ عملیات متوقف شد.' });
    };

    const startMining = async () => {
        if (isRunning) stopMining();
        setLogs([]);
        setCurrentCycle(null);
        setIsRunning(true);
        addLog({ type: 'info', message: '🚀 شروع عملیات معدن...' });

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('/api/miner/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: restoreKey, action: selectedAction, continuous: true }),
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

                            if (data.type === 'cycle_result') {
                                setCurrentCycle(data);
                                addLog({ type: 'cycle_result', ...data });
                            } else if (data.type === 'wait_tick') {
                                addLog({ type: 'wait_tick', seconds_left: data.seconds_left, message: data.message });
                            } else if (data.type === 'error') {
                                let userMessage = '';
                                switch (data.subtype) {
                                    case 'online_another_device':
                                        userMessage = '❌ شما در حال حاضر روی دستگاه دیگری آنلاین هستید. لطفاً بازی را در دستگاه دیگر ببندید و دوباره تلاش کنید.';
                                        break;
                                    case 'invalid_key':
                                        userMessage = '❌ کلید بازیابی نامعتبر است. لطفاً کلید صحیح را وارد کنید.';
                                        break;
                                    case 'account_blocked':
                                        userMessage = '❌ حساب شما مسدود شده است.';
                                        break;
                                    case 'server_maintenance':
                                        userMessage = '❌ سرور در حال تعمیرات است. بعداً تلاش کنید.';
                                        break;
                                    case 'no_mine_cards':
                                        userMessage = '❌ هیچ کارتی به معدن اختصاص داده نشده است. لطفاً حداقل یک کارت در معدن قرار دهید.';
                                        break;
                                    default:
                                        userMessage = `❌ خطا: ${data.message}`;
                                }
                                addLog({ type: 'error', message: userMessage });
                                setIsRunning(false);
                                if (abortControllerRef.current) {
                                    abortControllerRef.current.abort();
                                    abortControllerRef.current = null;
                                }
                                return;
                            } else if (data.type === 'end') {
                                addLog({ type: 'info', message: `🏁 ${data.message}` });
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
                console.error(error);
                addLog({ type: 'error', message: `❌ خطای شبکه: ${error.message}` });
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeySubmit = () => {
        if (restoreKey.trim()) setStep(2);
    };

    const handleChangeKey = () => {
        if (isRunning) stopMining();
        setStep(1);
        setLogs([]);
    };

    const handleRestart = () => {
        if (isRunning) stopMining();
        setTimeout(startMining, 200);
    };

    // ========== RENDER ==========
    return (
        <div className="p-4 font-sans w-full">
            <div className="mx-auto max-w-4xl">
                {step === 1 && !isHydrated ? (
                    <div className="card bg-base-100 shadow-xl max-w-md mx-auto">
                        <div className="card-body items-center text-center">
                            <div className="skeleton h-32 w-full"></div>
                        </div>
                    </div>
                ) : step === 1 && isHydrated ? (
                    <div className="card bg-base-100 shadow-xl max-w-md mx-auto">
                        <div className="card-body items-center text-center">
                            <div className="p-4 bg-primary/10 rounded-full mb-4">
                                <Key className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="card-title text-2xl">ورود به حساب</h2>
                            <p className="text-sm text-gray-500 mb-6">کلید بازیابی اکانت خود را وارد کنید</p>
                            <input
                                type="text"
                                placeholder="Restore Key"
                                className="input input-bordered w-full mb-4 font-mono"
                                value={restoreKey||''}
                                onChange={(e) => setRestoreKey(e.target.value)}
                                suppressHydrationWarning
                            />
                            <button
                                className="btn btn-primary w-full"
                                disabled={!restoreKey}
                                onClick={handleKeySubmit}
                                suppressHydrationWarning
                            >
                                ادامه <ArrowRight className="w-4 h-4 mr-2" />
                            </button>
                        </div>
                    </div>
                ) : step === 2 && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="card bg-base-100 shadow-sm p-4 flex flex-wrap justify-between items-center gap-2">
                            <span className="font-mono text-sm opacity-70 truncate max-w-[200px]">{restoreKey}</span>
                            <div className="flex gap-2">
                                <button className="btn btn-outline btn-error btn-sm gap-1" onClick={stopMining} disabled={!isRunning}>
                                    <StopCircle className="w-4 h-4" /> توقف
                                </button>
                                <button className="btn btn-outline btn-warning btn-sm gap-1" onClick={handleRestart} disabled={isRunning && !abortControllerRef.current}>
                                    <RefreshCw className="w-4 h-4" /> راه‌اندازی مجدد
                                </button>
                                <button className="btn btn-outline btn-info btn-sm gap-1" onClick={handleChangeKey}>
                                    <LogOut className="w-4 h-4" /> تغییر کلید
                                </button>
                            </div>
                        </div>

                        {/* Action selector */}
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title gap-2">
                                    <Pickaxe className="w-6 h-6 text-warning" />
                                    مدیریت معدن
                                </h2>
                                <ActionSelector value={selectedAction} onChange={setSelectedAction} />
                                <div className="card-actions justify-end mt-4">
                                    <button
                                        className={'btn btn-primary w-full gap-2'}
                                        onClick={startMining}
                                        disabled={isRunning}
                                    >
                                        {!isRunning ? <Database className="w-4 h-4" /> : <Loader className="w-5 h-5 animate-spin" />}
                                        {isRunning ? 'در حال اجرا...' : 'شروع استخراج مستمر'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Live Logs Terminal */}
                        <div className="card bg-base-100 shadow-inner">
                            <div className="card-body p-4">
                                <h3 className="font-mono text-sm flex items-center gap-2">
                                    <span className="badge badge-sm badge-primary">Live Log</span>
                                    {isRunning && <Loader className="animate-spin w-3 h-3" />}
                                </h3>
                                <div className="bg-black/80 text-green-400 font-mono text-xs p-3 rounded-box h-64 overflow-y-auto" ref={logContainerRef}>
                                    {logs.length === 0 && (
                                        <div className="text-gray-500">انتظار برای شروع عملیات...</div>
                                    )}
                                    {logs.map((log, idx) => {
                                        if (log.type === 'cycle_result') {
                                            return (
                                                <div key={idx} className="border-b border-gray-700 py-1">
                                                    <span className="text-yellow-400">چرخه {log.cycle}</span> |
                                                    جمع‌آوری: <span className="text-blue-300">{log.collected_gold?.toLocaleString()}</span> طلا |
                                                    موجودی: <span className="text-green-300">{log.player_gold?.toLocaleString()}</span> |
                                                    اقدام: {log.action?.message}
                                                </div>
                                            );
                                        // } else if (log.type === 'wait_tick') {
                                        //     return (
                                        //         <div key={idx} className="text-gray-400 text-xs">
                                        //             ⏳ {log.message || `منتظر پر شدن مخزن... ${log.seconds_left} ثانیه باقی‌مانده`}
                                        //         </div>
                                        //     );
                                        } else if (log.type === 'error') {
                                            return <div key={idx} className="text-red-400">❌ {log.message}</div>;
                                        } else {
                                            return <div key={idx} className="text-gray-300">{log.message}</div>;
                                        }
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Current cycle summary */}
                        {currentCycle && (
                            <div className="alert alert-success shadow-lg">
                                <div>
                                    <Trophy className="w-5 h-5" />
                                    <span>آخرین چرخه: {currentCycle.collected_gold?.toLocaleString()} طلا جمع‌آوری شد | نرخ استخراج: {currentCycle.mining_rate_per_hour?.toLocaleString()} طلا/ساعت</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Link href="./" className="w-full btn btn-ghost items-center justify-center gap-3 rounded-box border-2 border-base-100 bg-base-200 px-4 py-3 my-3 text-sm font-medium">
                <ArrowRight className="w-4 h-4 rotate-180" />
                بازگشت به خانه
            </Link>
        </div>
    );
}