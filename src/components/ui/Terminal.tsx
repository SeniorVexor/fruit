'use client';

import { useEffect, useRef } from 'react';
import {Eraser, Hourglass} from "lucide-react";

interface TerminalProps {
    output: string;
    autoScroll?: boolean;
    wasCleared?: boolean; // ✅ prop جدید
}

export function Terminal({ output, autoScroll = true, wasCleared = false }: TerminalProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [output, autoScroll]);

    return (
        <div dir={"ltr"} className="bg-neutral text-neutral-content max-h-96 overflow-y-auto rounded-box font-mono text-sm p-0">
            <pre className="px-4 py-3 whitespace-pre-wrap break-all">
                <code className="text-success">
                    {/* ✅ نمایش شرطی صحیح با JSX */}
                    {output ? (
                        output
                    ) : wasCleared ? (
                        <>
                            <span className="align-middle">ترمینال پاک شد</span>
                            <Eraser className="w-4 h-4 inline-block align-middle mr-1" />
                        </>
                    ) : (
                        <>
                            <span className="align-middle">منتظر اجرای اسکریپت...</span>
                            <Hourglass className="w-4 h-4 inline-block align-middle mr-1" />
                        </>
                    )}
                </code>
            </pre>
            <div ref={endRef} />
        </div>
    );
}