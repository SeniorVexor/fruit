'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Terminal } from '../ui/Terminal';
import { X, Trash2, Download, RotateCw } from 'lucide-react';

interface ScriptTerminalProps {
    output: string;
    onClear: () => void;
    onClose: () => void;
    onRestart: () => void;
    running: boolean;
}

export function ScriptTerminal({ output, onClear, onClose, onRestart, running }: ScriptTerminalProps) {
    const [autoScroll, setAutoScroll] = useState(true);
    const [wasCleared, setWasCleared] = useState(false); // ✅ وضعیت پاک شدن

    const handleDownload = () => {
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `script-output-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearClick = () => {
        setWasCleared(true); // ✅ ست کردن وضعیت پاک شدن
        onClear(); // ✅ اجرای onClear parent
    };

    // ✅ ریست کردن wasCleared وقتی خروجی جدید می‌آید
    useEffect(() => {
        if (output && wasCleared) {
            setWasCleared(false);
        }
    }, [output, wasCleared]);

    return (
        <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body p-0">
                <div className="flex justify-center items-center p-4 bg-base-200 rounded-t-box border-b border-base-300">
                    <h3 className="font-bold flex items-center gap-2">
                        ترمینال اجرا {running && '(در حال اجرا...)'}
                    </h3>

                    <div className="flex gap-2">
                        <Button className={"bg-green-500"} size="sm" variant="ghost" onClick={handleDownload} title="دانلود خروجی">
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button
                            className={"bg-yellow-500"}
                            size="sm"
                            variant="ghost"
                            onClick={handleClearClick}  // ✅ استفاده از handleClearClick
                            title="پاک کردن"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button className={`bg-red-500 ${!running && 'hidden'}`} size="sm" variant="ghost" onClick={onClose} title="بستن">
                            <X className="w-4 h-4" />
                        </Button>
                        <Button className={`bg-blue-500 ${running && 'hidden'}`} size="sm" variant="ghost" onClick={onRestart} title="بستن">
                            <RotateCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4">
                    {/* ✅ پاس دادن wasCleared به Terminal */}
                    <Terminal output={output} autoScroll={autoScroll} wasCleared={wasCleared} />
                </div>

                {/* ✅ دکمه بازگشت به فرم فقط وقتی اسکریپت تموم شده */}
                {!running && (
                    <div className="card-actions justify-end p-4 border-t border-base-300">
                        <Button onClick={onClose} variant="ghost">
                            بازگشت به فرم
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}