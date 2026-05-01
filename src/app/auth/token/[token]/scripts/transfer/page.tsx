// app/transfer/[token]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react';
import { useTransfer } from '@/hooks/useTransfer';
import TransferForm from '@/components/script/transfer/TransferForm';
import TransferAlerts from '@/components/script/transfer/TransferAlerts';
import TransferActions from '@/components/script/transfer/TransferActions';
import TransferConfirmModal from '@/components/script/transfer/TransferConfirmModal';
import CountInputModal from '@/components/script/transfer/CountInputModal';
import TransferLogs from '@/components/script/transfer/TransferLogs';

export default function TransferPage() {
    const params = useParams();
    const token = params.token as string;

    const {
        sellerKey, setSellerKey,
        buyerKey, setBuyerKey,
        targetInput, setTargetInput,
        useBaseId,
        isChecking, isTransferring,
        error, success, logs,
        showCountModal, showConfirm, countModalData, selectedCount,
        handleModeChange,
        checkAvailability,
        handleCountConfirm,
        prepareTransfer,
        runTransfer,
        setShowCountModal,
        setShowConfirm,
        clearError,
        goBack,
    } = useTransfer(token);

    return (
        <div className="h-full bg-base-200 p-4 md:p-8" dir="rtl">
            <div className="max-w-4xl mx-auto">
                {/* Main Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body space-y-6">
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <ArrowLeftRight className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">انتقال کارت</h1>
                                    <p className="text-sm text-base-content/70">انتقال کارت بین اکانت‌ها</p>
                                </div>
                            </div>
                            <div className="w-24" />
                        </div>

                        {/* Form Component */}
                        <TransferForm
                            sellerKey={sellerKey}
                            buyerKey={buyerKey}
                            targetInput={targetInput}
                            useBaseId={useBaseId}
                            isTransferring={isTransferring}
                            isChecking={isChecking}
                            onSellerChange={setSellerKey}
                            onBuyerChange={setBuyerKey}
                            onTargetChange={setTargetInput}
                            onModeChange={handleModeChange}
                        />

                        {/* Alerts */}
                        <TransferAlerts
                            error={error}
                            success={success}
                            isTransferring={isTransferring}
                            onClearError={clearError}
                        />

                        {/* Action Buttons */}
                        <TransferActions
                            useBaseId={useBaseId}
                            isChecking={isChecking}
                            isTransferring={isTransferring}
                            targetInput={targetInput}
                            sellerKey={sellerKey}
                            buyerKey={buyerKey}
                            onCheck={checkAvailability}
                            onTransfer={prepareTransfer}
                        />
                    </div>
                </div>

                {/* Back Button */}
                <button
                    onClick={goBack}
                    className="btn btn-ghost gap-2 w-full my-4"
                    disabled={isTransferring}
                >
                    <ChevronLeft className="w-4 h-4" />
                    بازگشت
                </button>
            </div>

            {/* Modals */}
            {countModalData && (
                <CountInputModal
                    data={countModalData}
                    initialCount={1}
                    isOpen={showCountModal}
                    onClose={() => !isChecking && setShowCountModal(false)}
                    onConfirm={handleCountConfirm}
                />
            )}

            <TransferConfirmModal
                isOpen={showConfirm}
                sellerKey={sellerKey}
                buyerKey={buyerKey}
                targetInput={targetInput}
                useBaseId={useBaseId}
                selectedCount={selectedCount}
                isTransferring={isTransferring}
                onClose={() => setShowConfirm(false)}
                onConfirm={runTransfer}
            />

            {/* Logs Terminal */}
            <TransferLogs
                logs={logs}
                isOpen={isTransferring}
                onClose={() => {}} // Cannot close while transferring
                title="لاگ‌های عملیات انتقال (Real-time)"
            />
        </div>
    );
}
