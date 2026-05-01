// components/TransferAlerts.tsx
'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface TransferAlertsProps {
    error: string | null;
    success: string | null;
    isTransferring: boolean;
    onClearError: () => void;
}

export default function TransferAlerts({ error, success, isTransferring, onClearError }: TransferAlertsProps) {
    if (!error && (!success || isTransferring)) return null;

    return (
        <div className="space-y-3">
            {error && (
                <div className="alert alert-error shadow-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={onClearError}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {success && !isTransferring && (
                <div className="alert alert-success shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{success}</span>
                </div>
            )}
        </div>
    );
}
