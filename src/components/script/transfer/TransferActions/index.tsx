'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Loader2 } from 'lucide-react';
import {useMounted} from "@/hooks/useMounted";

interface TransferActionsProps {
    useBaseId: boolean;
    isChecking: boolean;
    isTransferring: boolean;
    targetInput: string;
    sellerKey: string;
    buyerKey: string;
    onCheck: () => void;
    onTransfer: () => void;
}

export default function TransferActions({
                                            useBaseId,
                                            isChecking,
                                            isTransferring,
                                            targetInput,
                                            sellerKey,
                                            buyerKey,
                                            onCheck,
                                            onTransfer,
                                        }: TransferActionsProps) {

    const isMounted = useMounted();
    const isFormEmpty = !targetInput || !sellerKey || !buyerKey;
    const isLoading = isChecking || isTransferring;

    // این خط کلیدیه - تا mount نشده، disabled نگهش می‌داره
    const isDisabled = !isMounted || isLoading || isFormEmpty;

    return (
        <div className="card-actions justify-end pt-4">
            {useBaseId ? (
                <button
                    className="btn btn-primary gap-2 w-full"
                    onClick={onCheck}
                    disabled={isDisabled || isChecking}
                >
                    {isChecking ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            در حال بررسی موجودی...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            بررسی موجودی و انتخاب تعداد
                        </>
                    )}
                </button>
            ) : (
                <button
                    className="btn btn-primary gap-2 w-full"
                    onClick={onTransfer}
                    disabled={isDisabled}
                >
                    {isTransferring ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            در حال اجرا...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            اجرای انتقال
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
