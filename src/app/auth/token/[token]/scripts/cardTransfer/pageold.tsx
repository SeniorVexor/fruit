'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Key, ArrowRight, Loader2, Terminal, Play,
    ChevronLeft, ChevronRight, Filter,
    Minus, Plus, Maximize2, Package, User, UserPlus,
    CheckCircle, AlertCircle, TrendingUp, Wallet,
    RefreshCw, Zap, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCompactNumber } from "@/lib/utils";

// --- Types ---
interface CardItem {
    card_id: number;
    base_id: number;
    power: number;
    name: string;
    originalName: string;
}

interface PowerGroup {
    power: number;
    formattedPower: string;
    cards: CardItem[];
    count: number;
}

// --- Config ---
const BLOCKED_BASE_IDS: number[] = [
    414,412,
    514,
    614,
    714,
    814,
    840,400,
    841,
    843,
    844,406
];
const NAME_MAPPINGS: Record<number, string> = {
    121: "berry I",

    226: "anbe I",

    289: "strawberry I",

    313: "killer II",
    332: "killer III",
    342: "killer V",
    816: "killer VI",

    315: "mummy II",
    334: "mummy III",
    343: "mummy V",
    817: "mummy VI",

    316: "zombie I",
    317: "zombie II",
    341: "zombie V",
    818: "zombie VI",

    318: "porteghola I",
    319: "porteghola II",
    339: "porteghola III",
    819: "porteghola VI",

    311: "black berry II",
    330: "black berry III",
    331: "black berry IV",

    400: "khormaloo VII",
    840: "khormaloo IX",

    406: "pine-apple VII",
    844: "pine-apple IX",

    413: "pumpkin VI",
    414: 'pumpkin VII',

    841: "Dragon IX",

    843: "star IX",

    514: "xakhmi 100",
    614: "zebelus 100",
    714: "hoshider 100",
    814: "sibilu 100",
};
const DEFAULT_MIN_POWER = 14;
const DEFAULT_MAX_POWER = 148000000000;
const ITEMS_PER_PAGE = 10; // افزایش برای نمایش 2×2 بهتر

// --- Utility: Format Power ---
const formatPower = (num: number): string => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`.replace('.0B', 'B');
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`.replace('.0M', 'M');
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`.replace('.0K', 'K');
    return num.toString();
};

export default function CardTransferPage() {
    // --- State ---
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [sellerKey, setSellerKey] = useState('');
    const [buyerKey, setBuyerKey] = useState('');
    const [powerRange, setPowerRange] = useState<[number, number]>([DEFAULT_MIN_POWER, 50000000]);
    const [rawCards, setRawCards] = useState<CardItem[]>([]);
    const [sellerInfo, setSellerInfo] = useState<{gold: number, level: number} | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<PowerGroup | null>(null);
    const [transferCount, setTransferCount] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [terminalOutput, setTerminalOutput] = useState<string>('');
    const [transferStats, setTransferStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // AbortController ref برای لغو درخواست‌ها
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => {
            // Cleanup: لغو درخواست در حال اجرا هنگام unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const getErrorMessage = (error: any): { message: string; type: 'maintenance' | 'network' | 'auth' | 'unknown' } => {
        const msg = error?.message || 'خطای ناشناخته رخ داد';

        if (msg.includes('maintenance') || msg.includes('maintenance')) {
            return {
                message: '⏳ سرور بازی در حال تعمیر و نگهداری است. لطفاً چند دقیقه دیگر امتحان کنید.',
                type: 'maintenance'
            };
        }
        if (msg.includes('HTTP 401') || msg.includes('invalid key') || msg.includes('authentication')) {
            return {
                message: '🔑 کلید بازیابی نامعتبر است یا دسترسی غیرمجاز',
                type: 'auth'
            };
        }
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('HTTP')) {
            return {
                message: '🌐 خطای شبکه. اتصال اینترنت را بررسی کنید.',
                type: 'network'
            };
        }
        if (msg.includes('parse') || msg.includes('JSON')) {
            return {
                message: '📡 پاسخ سرور نامعتبر است. لطفاً دوباره تلاش کنید.',
                type: 'unknown'
            };
        }

        return { message: `⚠️ ${msg}`, type: 'unknown' };
    };


    // --- Process Cards (memoized) ---
    const processedGroups = useMemo(() => {
        const byPower: Record<string, CardItem[]> = {};

        rawCards.forEach(card => {
            if (!byPower[card.power]) byPower[card.power] = [];
            byPower[card.power].push(card);
        });

        const groups: PowerGroup[] = [];
        Object.entries(byPower).forEach(([powerStr, cards]) => {
            const power = parseInt(powerStr);
            if (power < powerRange[0] || power > powerRange[1]) return;

            const filteredCards = cards
                .filter(card => !BLOCKED_BASE_IDS.includes(card.base_id))
                .map(card => ({
                    ...card,
                    originalName: card.name,
                    name: NAME_MAPPINGS[card.base_id] || card.name
                }))
                .filter(card => card.name !== 'Unknown' || !NAME_MAPPINGS[card.base_id]);

            if (filteredCards.length > 0) {
                groups.push({
                    power,
                    formattedPower: formatPower(power),
                    cards: filteredCards,
                    count: filteredCards.length
                });
            }
        });
        return groups.sort((a, b) => b.power - a.power);
    }, [rawCards, powerRange]);

    const totalPages = Math.ceil(processedGroups.length / ITEMS_PER_PAGE);
    const paginatedGroups = processedGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // --- API Handlers ---
    const handleListCards = useCallback(async () => {
        if (isLoading) return;

        if (!sellerKey.trim()) {
            toast.error('کلید بازیابی فروشنده را وارد کنید');
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setError(null);
        setStep(2);
        setTerminalOutput('> Connecting to server...\n');
        setRawCards([]);
        setSellerInfo(null);

        // ⭐ شروع Toast Loading
        let loadingToast;
        loadingToast = toast.loading('⏳ در حال دریافت لیست کارت‌ها...');

        let fullOutput = '';

        try {
            const response = await fetch('/api/cardTransfer/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal: abortController.signal,
                body: JSON.stringify({
                    action: 'list',
                    sellerKey: sellerKey,
                })
            });

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch {
                    errorText = response.statusText;
                }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('مرورگر شما از استریمینگ پشتیبانی نمی‌کند');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let jsonExtracted = false;

            while (true) {
                const { done, value } = await reader.read();

                if (abortController.signal.aborted) {
                    toast.dismiss(loadingToast);
                    return;
                }

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    fullOutput += chunk;
                    setTerminalOutput(prev => prev + chunk);
                }

                if (done) {
                    const startMatch = fullOutput.match(/---RESULT_START---\s*(\{[\s\S]*?\})\s*---RESULT_END---/);

                    if (startMatch) {
                        let data;
                        try {
                            data = JSON.parse(startMatch[1]);
                        } catch (parseError: any) {
                            throw new Error('فرمت پاسخ سرور نامعتبر است');
                        }

                        if (!data.success) {
                            throw new Error(data.error || 'خطای نامشخص از سمت سرور');
                        }

                        if (data.data && data.mode === 'list_cards') {
                            setSellerInfo({
                                gold: data.data.seller_gold,
                                level: data.data.seller_level
                            });

                            const allCards: CardItem[] = [];
                            Object.entries(data.data.cards_by_power || {}).forEach(([power, cards]: [string, any]) => {
                                if (Array.isArray(cards)) {
                                    cards.forEach((card: any) => {
                                        allCards.push({
                                            ...card,
                                            power: parseInt(power),
                                            originalName: card.name,
                                            name: NAME_MAPPINGS[card.base_id] || card.name
                                        });
                                    });
                                }
                            });

                            setRawCards(allCards);
                            jsonExtracted = true;

                            // ⭐ پایان موفق - dismiss loading و نمایش success
                            toast.dismiss(loadingToast);
                            if (allCards.length > 0) {
                                toast.success(`✅ ${allCards.length} کارت یافت شد`);
                            } else {
                                toast.error('هیچ کارت فیلترنشده‌ای در این اکانت یافت نشد');
                            }

                            setStep(3);
                        } else {
                            throw new Error('ساختار داده دریافتی نادرست است');
                        }
                    } else {
                        if (fullOutput.includes('FATAL ERROR') || fullOutput.includes('Traceback')) {
                            throw new Error('خطای اجرای اسکریپت. لطفاً لاگ‌ها را بررسی کنید');
                        }
                        throw new Error('پاسخ مورد انتظار از سرور دریافت نشد');
                    }

                    if (!jsonExtracted) {
                        throw new Error('استخراج داده ناموفق بود');
                    }
                    break;
                }
            }

        } catch (error: any) {
            // ⭐ dismiss loading در صورت خطا
            if (loadingToast) toast.dismiss(loadingToast);

            if (error.name === 'AbortError') {
                setTerminalOutput(prev => prev + '\n[SYSTEM] عملیات لغو شد\n');
                setStep(1);
                return;
            }

            const { message, type } = getErrorMessage(error);
            setError(message);
            toast.error(message, {
                duration: type === 'maintenance' ? 6000 : 4000,
                icon: type === 'maintenance' ? '⏳' : '⚠️'
            });

            console.error('List cards failed:', error);
            setTerminalOutput(prev => prev + `\n[ERROR] ${message}\n`);
            setStep(1);

        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [sellerKey, isLoading]);

    const handleTransfer = useCallback(async () => {
        if (!selectedGroup || isLoading) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setStep(5);
        setTerminalOutput('> شروع فرآیند انتقال...\n');
        setTransferStats(null);
        setError(null);

        const baseId = selectedGroup.cards[0]?.base_id;
        if (!baseId) {
            const msg = 'شناسه پایه کارت یافت نشد';
            setError(msg);
            toast.error(msg);
            setIsLoading(false);
            return;
        }

        // ⭐ استفاده از toast.loading
        let loadingToast;
        loadingToast = toast.loading('⏳ در حال انتقال کارت‌ها...');

        try {
            const response = await fetch('/api/cardTransfer/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal: abortController.signal,
                body: JSON.stringify({
                    action: 'transfer',
                    sellerKey: sellerKey,
                    buyerKey: buyerKey,
                    baseId: baseId,
                    count: transferCount
                })
            });

            if (!response.ok) {
                let errorMsg = '';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || `خطای سرور: ${response.status}`;
                } catch {
                    errorMsg = `خطای ارتباط: ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let resultParsed = false;

            if (!reader) throw new Error('عدم پشتیبانی از استریم');

            while (true) {
                const { done, value } = await reader.read();
                if (abortController.signal.aborted) {
                    toast.dismiss(loadingToast);
                    toast.error('عملیات متوقف شد');
                    return;
                }
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                buffer += text;

                const startTag = '---RESULT_START---';
                const endTag = '---RESULT_END---';
                const startIdx = buffer.indexOf(startTag);

                if (startIdx !== -1) {
                    const beforeMarker = buffer.substring(0, startIdx);
                    if (beforeMarker) {
                        setTerminalOutput(prev => prev + beforeMarker);
                    }

                    const endIdx = buffer.indexOf(endTag, startIdx);
                    if (endIdx !== -1 && !resultParsed) {
                        const jsonStr = buffer.substring(startIdx + startTag.length, endIdx).trim();

                        let data;
                        try {
                            data = JSON.parse(jsonStr);
                        } catch (e: any) {
                            throw new Error('پاسخ نامعتبر از سرور دریافت شد');
                        }

                        if (!data.success) {
                            throw new Error(data.error || 'انتقال ناموفق بود');
                        }

                        setTransferStats(data.data || {});
                        resultParsed = true;

                        // ⭐ dismiss loading و نمایش success
                        toast.dismiss(loadingToast);
                        const successCount = data.data?.summary?.success || 0;
                        toast.success(`✅ ${successCount} کارت با موفقیت انتقال یافت`);

                        buffer = buffer.substring(endIdx + endTag.length);
                    }
                } else {
                    if (buffer.length > 1000) {
                        setTerminalOutput(prev => prev + buffer.substring(0, 500));
                        buffer = buffer.substring(500);
                    }
                }
            }

            if (!resultParsed) {
                throw new Error('نتیجه انتقال دریافت نشد');
            }

        } catch (error: any) {
            // ⭐ حتماً loading رو dismiss کن
            if (loadingToast) toast.dismiss(loadingToast);

            if (error.name === 'AbortError') {
                setTerminalOutput(prev => prev + '\n[SYSTEM] لغو شد\n');
                return;
            }

            const { message, type } = getErrorMessage(error);
            setError(message);
            toast.error(message);

            console.error('Transfer failed:', error);
            setTerminalOutput(prev => prev + `\n[ERROR] ${message}\n`);

        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [selectedGroup, sellerKey, buyerKey, transferCount, isLoading]);

    // --- Scroll terminal ---
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalOutput]);

    // --- Colorized Terminal Lines ---
    const renderTerminalContent = () => {
        if (!terminalOutput) return <span className="text-gray-500">در حال اتصال...</span>;

        return terminalOutput.split('\n').map((line, idx) => {
            let colorClass = "text-gray-300";
            const lowerLine = line.toLowerCase();

            if (line.includes('[ERROR]') || line.includes('❌') || line.includes('failed') || lowerLine.includes('error') || lowerLine.includes('fatal'))
                colorClass = "text-red-400 font-semibold";
            else if (line.includes('[SUCCESS]') || line.includes('✅') || line.includes('successful') || lowerLine.includes('success') || line.includes('[DONE]'))
                colorClass = "text-green-400 font-semibold";
            else if (line.includes('[WARN]') || line.includes('⚠️') || lowerLine.includes('warning'))
                colorClass = "text-yellow-400";
            else if (line.includes('[INFO]') || line.includes('ℹ️') || line.includes('-->') || line.startsWith('>'))
                colorClass = "text-blue-400";
            else if (line.includes('Processing') || line.includes('Transferring') || line.includes('>>'))
                colorClass = "text-cyan-400";
            else if (line.includes('Found') || line.includes('Loaded'))
                colorClass = "text-purple-400";

            return <div key={idx} className={colorClass + " font-mono text-sm"}>{line || ' '}</div>;
        });
    };

    // --- Steps Rendering ---

    // Step 1: Input Seller Key

    if (!mounted) {
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }


    if (step === 1) {
        return (
            <div className="min-h-screen bg-base-200 p-4 flex items-center justify-center" dir="rtl">
                <div className="card bg-base-100 shadow-2xl max-w-lg w-full">
                    <div className="card-body">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Package className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="card-title text-2xl">انتقال کارت</h2>
                                <p className="text-sm text-base-content/60">انتقال امن کارت بین اکانت‌ها</p>
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-error mb-4">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text flex items-center gap-2">
                                        <User className="w-4 h-4" /> کلید بازیابی فروشنده
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered font-mono w-full mt-2"
                                    placeholder="seller-restore-key-xxx"
                                    value={sellerKey}
                                    onChange={(e) => setSellerKey(e.target.value)}
                                    dir="ltr"
                                    disabled={!mounted}
                                    suppressHydrationWarning
                                />
                            </div>

                            <button
                                className="btn btn-primary w-full mt-6 gap-2"
                                disabled={!mounted || !sellerKey.trim() || isLoading}
                                suppressHydrationWarning
                                onClick={handleListCards}
                            >
                                {isLoading ? (
                                    <><Loader2 className="animate-spin" /> در حال اتصال...</>
                                ) : (
                                    <><ArrowRight className="w-4 h-4" /> شروع فرآیند</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Loading
    if (step === 2) {
        return (
            <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-4 p-4" dir="rtl">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="text-xl font-semibold">در حال اتصال به اکانت فروشنده...</div>
                <div className="text-sm text-base-content/60">دریافت اطلاعات موجودی</div>

                {/*<div className="mt-4 p-4 bg-black/90 rounded-lg text-xs font-mono max-w-2xl w-full max-h-60 overflow-y-auto border border-gray-800">*/}
                {/*    {renderTerminalContent()}*/}
                {/*</div>*/}

                <button
                    onClick={() => {
                        if (abortControllerRef.current) {
                            abortControllerRef.current.abort();
                        }
                        setStep(1);
                        setIsLoading(false);
                    }}
                    className="btn btn-ghost btn-sm mt-4"
                >
                    انصراف
                </button>
            </div>
        );
    }

    // Step 3: Select Category
    if (step === 3) {
        return (
            <div className="min-h-screen bg-base-200 p-4" dir="rtl">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="card bg-base-100 shadow-sm">
                        <div className="card-body flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="card-title text-xl">انتخاب دسته‌بندی کارت</h2>
                                {sellerInfo && (
                                    <div className="text-sm text-base-content/60 flex gap-4 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Wallet className="w-4 h-4" />
                                            طلا: {formatCompactNumber(sellerInfo.gold)}
                                        </span>
                                        <span>سطح: {sellerInfo.level}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {/* ⭐ تغییر به grid 2 ستونه همیشگی */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {paginatedGroups.map((group) => {
                                // گرفتن نام کارت (اولین کارت یا "مخلوط")
                                const cardName = group.cards[0]?.name || "کارت";
                                const hasMultipleTypes = new Set(group.cards.map(c => c.name)).size > 1;
                                // const displayName = hasMultipleTypes ? `${cardName} (+)` : cardName;
                                const displayName = hasMultipleTypes ? `${cardName}` : cardName;

                                return (
                                    <div key={group.power} className="card bg-base-100 shadow-md hover:shadow-xl transition-all border border-base-200 hover:border-primary/50">
                                        <div className="card-body p-4 flex flex-col items-center text-center gap-3">
                                            {/* نام کارت */}
                                            <div className="w-full">
                                                <h3 className="font-bold text-base line-clamp-2 min-h-[3rem] flex items-center justify-center" title={displayName}>
                                                    {displayName}
                                                </h3>
                                            </div>

                                            {/* Power */}
                                            <div className="flex items-center gap-2 text-sm bg-base-200 px-3 py-1.5 rounded-full w-full justify-center">
                                                <Zap className="w-4 h-4 text-yellow-500" />
                                                <span className="text-base-content/70">قدرت : </span>
                                                <span className="font-bold text-primary">{group.formattedPower}</span>
                                            </div>

                                            {/* Count */}
                                            <div className="flex items-center gap-2 text-sm bg-base-200 px-3 py-1.5 rounded-full w-full justify-center">
                                                <Hash className="w-4 h-4 text-blue-500" />
                                                <span className="text-base-content/70">تعداد :</span>
                                                <span className="font-bold text-green-600">{group.count}</span>
                                            </div>

                                            {/* دکمه انتخاب */}
                                            <button
                                                className="btn btn-primary btn-sm w-full mt-2 gap-2"
                                                onClick={() => {
                                                    setSelectedGroup(group);
                                                    setTransferCount(1);
                                                    setStep(4);
                                                }}
                                            >
                                                <span>انتخاب</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                className="btn btn-sm btn-circle"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium">صفحه {currentPage} از {totalPages}</span>
                            <button
                                className="btn btn-sm btn-circle"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {processedGroups.length === 0 && (
                        <div className="text-center py-20 text-base-content/50">
                            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>کارتی با این محدوده یافت نشد</p>
                            <button
                                className="btn btn-ghost btn-sm mt-4"
                                onClick={() => setPowerRange([DEFAULT_MIN_POWER, DEFAULT_MAX_POWER])}
                            >
                                بازنشانی فیلتر
                            </button>
                        </div>
                    )}

                    <button
                        className="btn btn-ghost w-full"
                        onClick={() => setStep(1)}
                    >
                        بازگشت به کلیدها
                    </button>
                </div>
            </div>
        );
    }

    // Step 4: Buyer Key + Count Selection
    if (step === 4 && selectedGroup) {
        const maxAvailable = selectedGroup.count;
        const cardName = selectedGroup.cards[0]?.name || "کارت";

        return (
            <div className="min-h-screen bg-base-200 p-4 flex items-center justify-center" dir="rtl">
                <div className="card bg-base-100 shadow-2xl max-w-md w-full">
                    <div className="card-body">
                        <h2 className="card-title justify-center text-2xl mb-2">تایید نهایی و تعداد</h2>

                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl mb-6 space-y-3">
                            {/* نمایش نام کارت */}
                            <div className="text-center border-b border-primary/10 pb-2 mb-2">
                                <span className="text-sm text-base-content/70">نام کارت:</span>
                                <div className="font-bold text-lg text-primary">{cardName}</div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-base-content/70">قدرت کارت:</span>
                                <span className="font-bold text-primary">{selectedGroup.formattedPower}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-base-content/70">موجودی:</span>
                                <span className="font-bold">{maxAvailable.toLocaleString()} عدد</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-base-content/70">شناسه پایه:</span>
                                <span className="font-mono text-sm">{selectedGroup.cards[0]?.base_id}</span>
                            </div>
                        </div>

                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text font-bold flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" /> کلید بازیابی خریدار
                                </span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered font-mono ltr text-center w-full"
                                placeholder="buyer-restore-key-xxx"
                                value={buyerKey}
                                onChange={(e) => setBuyerKey(e.target.value)}
                                dir="ltr"
                            />
                            <label className="label">
                                <span className="label-text-alt text-warning flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    کلید بازیابی خریدار را وارد کنید
                                </span>
                            </label>
                        </div>

                        <div className="bg-base-200 p-6 rounded-2xl mb-6 text-center">
                            <div className="text-4xl font-bold text-primary mb-2">
                                {transferCount.toLocaleString()}
                            </div>
                            <div className="text-sm text-base-content/60">
                                از {maxAvailable.toLocaleString()} عدد موجود
                            </div>
                        </div>

                        <div className="flex justify-center gap-3 mb-6">
                            <button
                                className="btn btn-circle btn-lg btn-outline"
                                onClick={() => setTransferCount(Math.max(1, transferCount - 1))}
                                disabled={transferCount <= 1}
                            >
                                <Minus className="w-6 h-6" />
                            </button>

                            <button
                                className="btn btn-circle btn-lg btn-outline btn-primary"
                                onClick={() => setTransferCount(maxAvailable)}
                                title="انتخاب حداکثر"
                            >
                                <Maximize2 className="w-5 h-5" />
                            </button>

                            <button
                                className="btn btn-circle btn-lg btn-outline"
                                onClick={() => setTransferCount(Math.min(maxAvailable, transferCount + 1))}
                                disabled={transferCount >= maxAvailable}
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                className="btn btn-ghost flex-1"
                                onClick={() => setStep(3)}
                            >
                                بازگشت
                            </button>
                            <button
                                className="btn btn-primary flex-1 gap-2"
                                onClick={handleTransfer}
                                disabled={!buyerKey.trim() || transferCount < 1 || transferCount > maxAvailable}
                            >
                                <Play className="w-4 h-4" /> شروع انتقال
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Step 5: Transfer Progress & Results
    if (step === 5) {
        return (
            <div className="min-h-screen bg-base-200 p-4" dir="rtl">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Terminal - Show when no result yet or if there's an error */}
                    {(!transferStats || error) && (
                        <div className="card bg-[#0d1117] shadow-xl font-mono border border-gray-800">
                            <div className="bg-[#161b22] p-4 flex justify-between items-center border-b border-gray-800 rounded-t-2xl">
                                <div className="flex gap-2 items-center text-sm text-gray-300">
                                    <Terminal className="w-4 h-4" />
                                    <span>پیشرفت انتقال</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {!transferStats && !error && (
                                        <>
                                            <span className="loading loading-spinner loading-xs text-success"></span>
                                            <span className="text-xs text-gray-500">در حال اجرا...</span>
                                        </>
                                    )}
                                    {(transferStats || error) && (
                                        <span className="text-xs text-gray-500">اتمام یافت</span>
                                    )}
                                </div>
                            </div>
                            <div
                                ref={terminalRef}
                                className="p-4 overflow-y-auto h-80 whitespace-pre-wrap text-sm leading-relaxed bg-[#0d1117] rounded-b-2xl"
                            >
                                {renderTerminalContent()}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !transferStats && (
                        <div className="alert alert-error">
                            <AlertCircle className="w-6 h-6" />
                            <div className="flex-1">
                                <h3 className="font-bold">خطا در انتقال</h3>
                                <div className="text-sm">{error}</div>
                            </div>
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setStep(4)}
                            >
                                بازگشت
                            </button>
                        </div>
                    )}

                    {/* Results Grid */}
                    {transferStats && (
                        <div className="card bg-base-100 shadow-xl border-2 border-success/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="card-body">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-success/10 rounded-full">
                                        <CheckCircle className="w-8 h-8 text-success" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-success">انتقال با موفقیت انجام شد</h3>
                                        <p className="text-base-content/60">نتایج نهایی عملیات</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-base-200 p-4 rounded-xl text-center">
                                        <div className="text-3xl font-bold text-primary mb-1">
                                            {(transferStats.summary?.total || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-base-content/60">تعداد کل</div>
                                    </div>
                                    <div className="bg-success/10 border border-success/20 p-4 rounded-xl text-center">
                                        <div className="text-3xl font-bold text-success mb-1">
                                            {(transferStats.summary?.success || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-success/80">موفق</div>
                                    </div>
                                    <div className="bg-error/10 border border-error/20 p-4 rounded-xl text-center">
                                        <div className="text-3xl font-bold text-error mb-1">
                                            {(transferStats.summary?.lost || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-error/80">ناموفق</div>
                                    </div>
                                    <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl text-center">
                                        <div className="text-3xl font-bold text-warning mb-1">
                                            {Math.floor(transferStats.summary?.gold_moved || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-warning/80">طلا انتقال یافته</div>
                                    </div>
                                </div>

                                {transferStats.transfers && transferStats.transfers.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-sm text-base-content/70 mb-3">جزئیات کارت‌ها:</h4>
                                        <div className="grid gap-2 max-h-64 overflow-y-auto">
                                            {transferStats.transfers.map((transfer: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`flex justify-between items-center p-3 rounded-lg border ${
                                                        transfer.status === 'success'
                                                            ? 'bg-success/5 border-success/20'
                                                            : 'bg-error/5 border-error/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-base-content/50 w-6">{idx + 1}</span>
                                                        <div>
                                                            <div className="font-mono text-sm">کارت #{transfer.card_id}</div>
                                                            <div className="text-xs text-base-content/60">
                                                                قدرت: {(transfer.power || '-').toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {transfer.status === 'success' ? (
                                                            <CheckCircle className="w-5 h-5 text-success" />
                                                        ) : (
                                                            <AlertCircle className="w-5 h-5 text-error" />
                                                        )}
                                                        <span className={`text-sm ${
                                                            transfer.status === 'success' ? 'text-success' : 'text-error'
                                                        }`}>
                                                            {transfer.status === 'success' ? 'موفق' : 'ناموفق'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ⭐ دکمه انتقال مجدد */}
                                {/* ⭐ دکمه‌های کنترلی */}
                                <div className="flex flex-col md:flex-row gap-3 mt-6">
                                    {/* انتقال مجدد همین دسته */}
                                    <button
                                        className="btn btn-outline btn-primary flex-1 gap-2"
                                        onClick={() => {
                                            setTransferCount(1);
                                            setSelectedGroup(null);
                                            setTransferStats(null);
                                            setTerminalOutput('');
                                            setRawCards([]);
                                            setSellerInfo(null);
                                            setBuyerKey('');
                                            setError(null);
                                            // ⭐ فراخوانی مجدد fetch (handleListCards)
                                            handleListCards();
                                        }}
                                        disabled={isLoading}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        انتقال مجدد همین دسته
                                    </button>

                                    {/* ⭐ به‌روزرسانی لیست (fetch مجدد) */}
                                    {/*<button*/}
                                    {/*    className="btn btn-outline btn-info flex-1 gap-2"*/}
                                    {/*    onClick={() => {*/}
                                    {/*        // پاک کردن نتایج انتقال قبلی*/}
                                    {/*        setTransferCount(1);*/}
                                    {/*        setSelectedGroup(null);*/}
                                    {/*        setTransferStats(null);*/}
                                    {/*        setTerminalOutput('');*/}
                                    {/*        setRawCards([]);*/}
                                    {/*        setSellerInfo(null);*/}
                                    {/*        setBuyerKey('');*/}
                                    {/*        setError(null);*/}
                                    {/*        // ⭐ فراخوانی مجدد fetch (handleListCards)*/}
                                    {/*        handleListCards();*/}
                                    {/*    }}*/}
                                    {/*    disabled={isLoading}*/}
                                    {/*>*/}
                                    {/*    {isLoading ? (*/}
                                    {/*        <>*/}
                                    {/*            <Loader2 className="w-4 h-4 animate-spin" />*/}
                                    {/*            در حال بروزرسانی...*/}
                                    {/*        </>*/}
                                    {/*    ) : (*/}
                                    {/*        <>*/}
                                    {/*            <TrendingUp className="w-4 h-4" />*/}
                                    {/*            به‌روزرسانی لیست*/}
                                    {/*        </>*/}
                                    {/*    )}*/}
                                    {/*</button>*/}

                                    {/* شروع انتقال کاملاً جدید */}
                                    <button
                                        className="btn btn-success flex-1 gap-2"
                                        onClick={() => {
                                            // ریست کامل
                                            setStep(1);
                                            setTransferCount(1);
                                            setSelectedGroup(null);
                                            setTerminalOutput('');
                                            setTransferStats(null);
                                            setRawCards([]);
                                            setSellerInfo(null);
                                            setBuyerKey('');
                                            setSellerKey(''); // اینجا پاک می‌شود چون انتقال جدید با اکانت جدید است
                                            setError(null);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <User className="w-4 h-4" />
                                        اکانت جدید
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
