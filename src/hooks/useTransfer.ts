// hooks/useTransfer.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TransferLog, CountModalData, ErrorCode } from '@/types/script/transfer';
import { getErrorMessage, getErrorColor } from '@/lib/errors';

const MAX_TRANSFER_LIMIT = 50;
const STORAGE_KEYS = {
    SELLER_KEY: 'transfer_seller_key',
    BUYER_KEY: 'transfer_buyer_key',
};

interface StreamEvent {
    type: 'log' | 'progress' | 'error' | 'complete';
    message?: string;
    logType?: 'info' | 'error' | 'success' | 'warning';
    code?: ErrorCode | string;
    result?: {
        success_count: number;
        fail_count: number;
        total: number;
        seller_gold_before?: number;
        seller_gold_after?: number;
    };
}

interface CheckResponse {
    success: true;
    data: {
        base_id: number;
        cards: Array<{
            id: string | number;
            power?: number;
            name?: string;
            base_card_id?: number;
        }>;
    };
}

interface ApiErrorResponse {
    success: false;
    error_code: ErrorCode | string;
    message?: string;
}

export function useTransfer(token: string) {
    const router = useRouter();

    // Form states
    const [sellerKey, setSellerKey] = useState('');
    const [buyerKey, setBuyerKey] = useState('');
    const [targetInput, setTargetInput] = useState('');
    const [useBaseId, setUseBaseId] = useState(true);

    // UI states
    const [isChecking, setIsChecking] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null); // برای استایل‌دهی رنگی
    const [success, setSuccess] = useState<string | null>(null);
    const [logs, setLogs] = useState<TransferLog[]>([]);
    const logsRef = useRef<TransferLog[]>([]);

    // Modal states
    const [showCountModal, setShowCountModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [countModalData, setCountModalData] = useState<CountModalData | null>(null);
    const [selectedCount, setSelectedCount] = useState(1);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Load saved keys
    useEffect(() => {
        try {
            const savedSeller = localStorage.getItem(STORAGE_KEYS.SELLER_KEY) || '';
            const savedBuyer = localStorage.getItem(STORAGE_KEYS.BUYER_KEY) || '';
            if (savedSeller) setSellerKey(savedSeller);
            if (savedBuyer) setBuyerKey(savedBuyer);
        } catch {
            // Silent fail for SSR
        }
    }, []);

    // Auto-save keys
    useEffect(() => {
        try {
            if (sellerKey) localStorage.setItem(STORAGE_KEYS.SELLER_KEY, sellerKey);
            if (buyerKey) localStorage.setItem(STORAGE_KEYS.BUYER_KEY, buyerKey);
        } catch {
            // Silent fail
        }
    }, [sellerKey, buyerKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const addLog = useCallback((message: string, type: TransferLog['type'] = 'info') => {
        const newLog: TransferLog = {
            timestamp: new Date().toISOString(),
            message,
            type
        };
        logsRef.current = [...logsRef.current, newLog];
        setLogs(logsRef.current);
    }, []);

    const validateInputs = useCallback(() => {
        const keyRegex = /^[a-z0-9]{10,}$/;

        if (!keyRegex.test(sellerKey.trim())) {
            setErrorCode('VAL_001');
            setError(getErrorMessage('VAL_001'));
            return false;
        }
        if (!keyRegex.test(buyerKey.trim())) {
            setErrorCode('VAL_001');
            setError(getErrorMessage('VAL_001'));
            return false;
        }
        if (!targetInput.trim()) {
            setErrorCode('VAL_001');
            setError(getErrorMessage('VAL_001'));
            return false;
        }
        return true;
    }, [sellerKey, buyerKey, targetInput]);

    const clearError = useCallback(() => {
        setError(null);
        setErrorCode(null);
    }, []);

    const resetForm = useCallback(() => {
        setTargetInput('');
        setError(null);
        setErrorCode(null);
        setSuccess(null);
    }, []);

    const handleModeChange = useCallback((useBase: boolean) => {
        setUseBaseId(useBase);
        resetForm();
    }, [resetForm]);

    const checkAvailability = async () => {
        if (!validateInputs()) return;

        setError(null);
        setErrorCode(null);
        setSuccess(null);
        setIsChecking(true);

        try {
            const payload = {
                seller: sellerKey,
                buyer: buyerKey,
                mode: 'base_id' as const,
                target: targetInput.trim()
            };

            const response = await fetch('/api/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: (() => {
                    abortControllerRef.current = new AbortController();
                    return abortControllerRef.current.signal;
                })()
            });

            const data = await response.json() as CheckResponse | ApiErrorResponse;

            if (!data.success) {
                const errorData = data as ApiErrorResponse;
                const errMsg = getErrorMessage(errorData.error_code);
                setErrorCode(errorData.error_code);

                // هندلینگ خاص برای خطاهای جدید با آیکون
                if (errorData.error_code === 'SYS_003') {
                    setError(`⚠️ ${errMsg}`);
                    return;
                }

                if (errorData.error_code === 'SYS_004') {
                    setError(`🚫 ${errMsg}`);
                    // اختیاری: می‌توانید اینجا logout کنید
                    // router.push('/login');
                    return;
                }

                if (errorData.error_code === 'SYS_005') {
                    setError(`❌ ${errMsg}`);
                    return;
                }

                if (errorData.error_code === 'AVL_001') {
                    setError(`📭 ${errMsg}`);
                    return;
                }

                setError(errMsg);
                return;
            }

            const checkData = (data as CheckResponse).data;

            if (!checkData?.cards?.length) {
                setErrorCode('AVL_001');
                setError(`📭 ${getErrorMessage('AVL_001')}`);
                return;
            }

            setCountModalData({
                baseId: checkData.base_id,
                totalAvailable: checkData.cards.length,
                cardsPreview: checkData.cards.slice(0, 10),
                maxTransferLimit: Math.min(MAX_TRANSFER_LIMIT, checkData.cards.length),
            });
            setSelectedCount(1);
            setShowCountModal(true);

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setErrorCode('SYS_001');
                setError(err.message || getErrorMessage('SYS_001'));
            }
        } finally {
            setIsChecking(false);
        }
    };

    const handleCountConfirm = useCallback((count: number) => {
        setSelectedCount(count);
        setShowCountModal(false);
        setShowConfirm(true);
    }, []);

    const prepareTransfer = useCallback(() => {
        if (validateInputs()) {
            setShowConfirm(true);
        }
    }, [validateInputs]);

    const runTransfer = async () => {
        setShowConfirm(false);
        setIsTransferring(true);
        setError(null);
        setErrorCode(null);
        setSuccess(null);
        logsRef.current = [];
        setLogs([]);

        try {
            const payload: any = {
                seller: sellerKey,
                buyer: buyerKey,
                mode: useBaseId ? 'base_id' : 'single_id',
                target: targetInput.trim(),
            };

            if (useBaseId) {
                payload.count = selectedCount;
            }

            const response = await fetch('/api/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as ApiErrorResponse;
                if (errorData.error_code) {
                    setErrorCode(errorData.error_code);
                    const errMsg = getErrorMessage(errorData.error_code);

                    if (errorData.error_code === 'SYS_003') {
                        throw new Error(`⚠️ ${errMsg}`);
                    }
                    if (errorData.error_code === 'SYS_004') {
                        throw new Error(`🚫 ${errMsg}`);
                    }
                    if (errorData.error_code === 'SYS_005') {
                        throw new Error(`❌ ${errMsg}`);
                    }

                    throw new Error(errMsg);
                }
            }

            if (!response.body) {
                setErrorCode('SYS_001');
                throw new Error(getErrorMessage('SYS_001'));
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const event: StreamEvent = JSON.parse(line);

                        switch (event.type) {
                            case 'log':
                                addLog(event.message || '', event.logType || 'info');
                                break;
                            case 'error':
                                const errCode = event.code || 'TRF_001';
                                setErrorCode(errCode);
                                const errMsg = getErrorMessage(errCode);

                                // هندلینگ خطاهای جدید در استریم
                                if (errCode === 'SYS_003' || errCode === 'SYS_004' || errCode === 'SYS_005') {
                                    throw new Error(errMsg);
                                }

                                throw new Error(errMsg);
                            case 'complete':
                                if (event.result) {
                                    const { success_count, total } = event.result;
                                    setSuccess(
                                        useBaseId
                                            ? `انتقال انجام شد. موفق: ${success_count}/${total}`
                                            : success_count > 0
                                                ? 'کارت با موفقیت انتقال داده شد'
                                                : 'انتقال ناموفق بود'
                                    );
                                }
                                break;
                        }
                    } catch (parseErr: any) {
                        if (parseErr instanceof SyntaxError) {
                            addLog(line, 'info');
                        } else {
                            throw parseErr;
                        }
                    }
                }
            }

            if (buffer.trim()) {
                try {
                    const event: StreamEvent = JSON.parse(buffer);
                    if (event.type === 'complete' && event.result) {
                        const { success_count, total } = event.result;
                        setSuccess(
                            useBaseId
                                ? `انتقال انجام شد. موفق: ${success_count}/${total}`
                                : success_count > 0
                                    ? 'کارت با موفقیت انتقال داده شد'
                                    : 'انتقال ناموفق بود'
                        );
                    } else if (event.type === 'error' && event.code) {
                        setErrorCode(event.code);
                        throw new Error(getErrorMessage(event.code));
                    }
                } catch (e: any) {
                    if (e instanceof SyntaxError) {
                        addLog(buffer, 'info');
                    } else {
                        throw e;
                    }
                }
            }

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                const msg = err.message || getErrorMessage('SYS_001');
                setError(msg);
                addLog(`خطا: ${msg}`, 'error');
            }
        } finally {
            setIsTransferring(false);
            abortControllerRef.current = null;
        }
    };

    const goBack = useCallback(() => {
        router.push(`/auth/${token}/scripts`);
    }, [router, token]);

    // برای استفاده در کامپوننت جهت رنگ‌دهی به alert
    const errorColorClass = errorCode ? getErrorColor(errorCode) : '';

    return {
        // Form states
        sellerKey, setSellerKey,
        buyerKey, setBuyerKey,
        targetInput, setTargetInput,
        useBaseId,

        // UI states
        isChecking,
        isTransferring,
        error,
        errorCode,        // اضافه شده برای استایل‌دهی
        errorColorClass,  // کلاس رنگ مربوط به خطا
        success,
        logs,

        // Modal states
        showCountModal,
        showConfirm,
        countModalData,
        selectedCount,

        // Actions
        handleModeChange,
        checkAvailability,
        handleCountConfirm,
        prepareTransfer,
        runTransfer,
        setShowCountModal,
        setShowConfirm,
        clearError,
        goBack,
        addLog
    };
}
