'use client';

import { TransferLog } from '@/types/script/transfer';
import { X, Terminal } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface TransferLogsProps {
    logs: TransferLog[];
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export default function TransferLogs({
                                         logs,
                                         isOpen,
                                         onClose,
                                         title = 'لاگ‌های انتقال'
                                     }: TransferLogsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    const getLogColor = (type: TransferLog['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'success': return 'text-green-400';
            case 'warning': return 'text-yellow-400';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2 text-gray-200">
                        <Terminal className="w-5 h-5" />
                        <span className="font-semibold">{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Logs Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-950 space-y-1"
                    dir="ltr"
                >
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic text-center py-8">
                            در حال انتظار برای شروع عملیات...
                        </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} className="flex gap-2">
                <span className="text-gray-500 shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString('fa-IR')}]
                </span>
                                <span className={getLogColor(log.type)}>
                  {log.message}
                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Status */}
                <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
                    <span>وضعیت: {logs.length > 0 ? 'در حال پردازش...' : 'آماده'}</span>
                    <span>{logs.length} لاگ</span>
                </div>
            </div>
        </div>
    );
}
