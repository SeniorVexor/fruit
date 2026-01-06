'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import TwoStepForm from '@/components/scripts/TwoStepForm';
import { ScriptTerminal } from '@/components/scripts/ScriptTerminal';
import { runScript, killScript } from '@/lib/api';
import { flushSync } from 'react-dom';
import router from "next/router";
import {ArrowRight} from "lucide-react";
import Link from "next/link";

export default function AngorPage() {

    const [running, setRunning] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lastPayload, setLastPayload] = useState<Record<string, unknown>>({});

    const handleStart = useCallback(async (payload: {
        restore_key: string;
        attacks: number;
        doon_mode: string;
    }) => {
        try {
            setError(null);
            setRunning(true);
            setShowTerminal(true);
            setOutput('');
            setLastPayload(payload);

            console.log('🚀 Starting script with payload:', payload);

            runScript({
                scriptName: 'angor',
                payload,
                setOutput: (chunk) => {
                    flushSync(() => {
                        setOutput(prev => prev + chunk);
                    });
                },
                onError: (err) => {
                    console.error('❌ Script error:', err);
                    setError(err);
                    setRunning(false);
                },
                onComplete: () => {
                    console.log('✅ Script completed');
                    setRunning(false);
                },
            });

        } catch (err) {
            console.error('❌ Error in handleStart:', err);
            setError('❌ خطا در شروع اسکریپت');
            setRunning(false);
        }
    }, []);

    const handleRestart = useCallback(async () => {
        console.log('🔄 Restarting script...');

        if (running) {
            console.log('⏹️ Stopping current script...');
            await killScript('angor');
            setRunning(false);
        }

        console.log('🧹 Clearing previous output...');
        setOutput('');
        console.log('🚀 Restarting with last payload:', lastPayload);
        handleStart(lastPayload as any);

    }, [running, lastPayload, handleStart]);

    const handleClose = useCallback(async () => {
        if (confirm('آیا مطمئنی می‌خوای اسکریپت متوقف بشه؟')) {
            await killScript('angor');
            setRunning(false);
            setShowTerminal(false);
            setOutput('');
        }
    }, []);

    const handleClear = useCallback(() => setOutput(''), []);

    if (showTerminal) {
        return (
            <div className="max-w-5xl mx-auto p-4 items-center justify-center">
                <ScriptTerminal
                    output={output}
                    onClear={handleClear}
                    onClose={handleClose}
                    running={running}
                    onRestart={handleRestart}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto p-4 flex items-center justify-center flex-col gap-2">
            <TwoStepForm onConfirm={handleStart}/>
            <Link
                type="button"
                href="."
                // onClick={() => router.push('/..')}
                className="w-full btn btn-ghost items-center justify-center gap-3 rounded-box border-2 border-base-100 bg-base-200 px-4 py-3 text-sm font-medium"
            >
                <ArrowRight className="w-4 h-4 rotate-180" />
                بازگشت
            </Link>
        </div>
    );
}