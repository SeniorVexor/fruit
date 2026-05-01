'use client';

import { Key, Target, Package } from 'lucide-react';
import { useMounted } from "@/hooks/useMounted";

interface TransferFormProps {
    sellerKey: string;
    buyerKey: string;
    targetInput: string;
    useBaseId: boolean;
    isTransferring: boolean;
    isChecking: boolean;
    onSellerChange: (val: string) => void;
    onBuyerChange: (val: string) => void;
    onTargetChange: (val: string) => void;
    onModeChange: (useBase: boolean) => void;
}

export default function TransferForm({
                                         sellerKey,
                                         buyerKey,
                                         targetInput,
                                         useBaseId,
                                         isTransferring,
                                         isChecking,
                                         onSellerChange,
                                         onBuyerChange,
                                         onTargetChange,
                                         onModeChange,
                                     }: TransferFormProps) {
    const isMounted = useMounted();

    const isLoading = isTransferring || isChecking;
    const isFormEmpty = !sellerKey || !buyerKey;

    // مهم: تا زمانی که mount نشده (SSR و hydration اولیه)، همه disabled هستن
    // این باعث می‌شه سرور و کلاینت HTML یکسان تولید کنن
    const modeDisabled = !isMounted || isLoading;
    const keysDisabled = !isMounted || isLoading;
    const targetDisabled = !isMounted || isLoading || (!useBaseId && !sellerKey); // اختیاری: برای single ID می‌تونه شرط اضافی داشته باشه

    return (
        <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex justify-center">
                <div className="join w-full bg-base-200 px-4 py-2 justify-center rounded-lg gap-1">
                    <button
                        className={`join-item btn ${useBaseId ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => onModeChange(true)}
                        disabled={modeDisabled}
                    >
                        <Package className="w-4 h-4 ml-2" />
                        Base ID (گروهی)
                    </button>
                    <button
                        className={`join-item btn ${!useBaseId ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => onModeChange(false)}
                        disabled={modeDisabled}
                    >
                        <Target className="w-4 h-4 ml-2" />
                        Single ID (تکی)
                    </button>
                </div>
            </div>

            {/* Keys Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            کلید خصوصی فروشنده
                        </span>
                    </label>
                    <input
                        type="password"
                        placeholder="s.pdsr..1484f72"
                        className="input input-bordered w-full font-mono text-sm"
                        value={sellerKey}
                        onChange={(e) => onSellerChange(e.target.value)}
                        dir="ltr"
                        disabled={keysDisabled}
                        autoComplete="off"
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            کلید خصوصی خریدار
                        </span>
                    </label>
                    <input
                        type="password"
                        placeholder="sup.rt1..84f72"
                        className="input input-bordered w-full font-mono text-sm"
                        value={buyerKey}
                        onChange={(e) => onBuyerChange(e.target.value)}
                        dir="ltr"
                        disabled={keysDisabled}
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* Target Input */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text">
                        {useBaseId ? 'Base ID کارت' : 'ID کارت'}
                    </span>
                    <span className="label-text-alt text-base-content/50">
                        {useBaseId ? 'مثال: 121' : 'مثال: 739444248'}
                    </span>
                </label>
                <input
                    type="text"
                    placeholder={useBaseId ? 'شناسه base کارت را وارد کنید...' : 'شناسه single کارت را وارد کنید...'}
                    className="input input-bordered w-full font-mono"
                    value={targetInput}
                    onChange={(e) => onTargetChange(e.target.value)}
                    disabled={targetDisabled}
                />
            </div>
        </div>
    );
}
