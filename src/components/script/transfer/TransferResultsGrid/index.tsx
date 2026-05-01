'use client';

import { CheckCircle2, XCircle, Package } from 'lucide-react';

interface TransferResult {
    card_id: number;
    status: 'success' | 'failed';
    message?: string;
}

interface TransferResultsGridProps {
    results: TransferResult[];
}

export default function TransferResultsGrid({ results }: TransferResultsGridProps) {
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        نتایج انتقال
                    </h3>
                    <div className="flex gap-2">
                        <div className="badge badge-success gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {successCount} موفق
                        </div>
                        {failedCount > 0 && (
                            <div className="badge badge-error gap-1">
                                <XCircle className="w-3 h-3" />
                                {failedCount} ناموفق
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {results.map((result, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                                result.status === 'success'
                                    ? 'bg-success/10 border-success/30'
                                    : 'bg-error/10 border-error/30'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-sm font-bold">#{result.card_id}</span>
                                {result.status === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-error" />
                                )}
                            </div>
                            <div className={`text-xs ${result.status === 'success' ? 'text-success' : 'text-error'}`}>
                                {result.message || (result.status === 'success' ? 'انتقال موفق' : 'خطا')}
                            </div>
                        </div>
                    ))}
                </div>

                {results.length === 0 && (
                    <div className="text-center py-8 text-base-content/50">
                        نتیجه‌ای برای نمایش وجود ندارد
                    </div>
                )}
            </div>
        </div>
    );
}
