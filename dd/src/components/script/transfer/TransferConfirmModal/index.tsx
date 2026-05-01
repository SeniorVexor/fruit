// components/TransferConfirmModal.tsx
'use client';

import { AlertCircle, ArrowLeftRight, Loader2, X } from 'lucide-react';

interface TransferConfirmModalProps {
    isOpen: boolean;
    sellerKey: string;
    buyerKey: string;
    targetInput: string;
    useBaseId: boolean;
    selectedCount: number;
    isTransferring: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function TransferConfirmModal({
                                                 isOpen,
                                                 sellerKey,
                                                 buyerKey,
                                                 targetInput,
                                                 useBaseId,
                                                 selectedCount,
                                                 isTransferring,
                                                 onClose,
                                                 onConfirm,
                                             }: TransferConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-lg">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    تأیید نهایی عملیات
                </h3>

                <div className="bg-base-200 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-base-content/70">فروشنده:</span>
                        <span className="font-mono dir-ltr text-xs">
                            {sellerKey.slice(0, 12)}...{sellerKey.slice(-6)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-base-content/70">خریدار:</span>
                        <span className="font-mono dir-ltr text-xs">
                            {buyerKey.slice(0, 12)}...{buyerKey.slice(-6)}
                        </span>
                    </div>
                    <div className="divider my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-base-content/70">نوع انتقال:</span>
                        <span className="badge badge-primary">
                            {useBaseId ? 'Base ID (گروهی)' : 'Single ID (تکی)'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-base-content/70">هدف:</span>
                        <span className="font-mono font-bold">{targetInput}</span>
                    </div>
                    {useBaseId && (
                        <div className="flex justify-between items-center bg-primary/10 p-2 rounded mt-2">
                            <span className="text-base-content/70">تعداد کارت:</span>
                            <span className="font-bold text-primary text-lg">{selectedCount} عدد</span>
                        </div>
                    )}
                </div>

                <div className="modal-action mt-6">
                    <button
                        className="btn btn-ghost"
                        onClick={onClose}
                        disabled={isTransferring}
                    >
                        انصراف
                    </button>
                    <button
                        className={`btn btn-primary gap-2 min-w-[140px] ${isTransferring ? 'loading' : ''}`}
                        onClick={onConfirm}
                        disabled={isTransferring}
                    >
                        {isTransferring ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                در حال اجرا...
                            </>
                        ) : (
                            <>
                                بله، اجرا شود
                                <ArrowLeftRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={() => !isTransferring && onClose()}>
                <button className="cursor-default">close</button>
            </div>
        </div>
    );
}
