'use client';

import { useState, useEffect } from 'react';
import { Package, ArrowRightLeft, Minus, Plus, X, Layers } from 'lucide-react';
import { CountModalData } from '@/types/script/transfer';

interface CountInputModalProps {
    data: CountModalData;
    initialCount: number;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (count: number) => void;
}

export default function CountInputModal({
                                            data,
                                            initialCount,
                                            isOpen,
                                            onClose,
                                            onConfirm,
                                        }: CountInputModalProps) {
    // Ensure count is always a number, never undefined or null
    const [count, setCount] = useState<number>(initialCount || 1);
    const [isVisible, setIsVisible] = useState(false);

    // Handle modal open/close with animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setCount(initialCount || 1);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialCount]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isVisible) return null;

    const maxCount = Math.max(1, data.totalAvailable || 0);
    const isValid = count >= 1 && count <= maxCount;

    const handleDecrease = () => {
        setCount(prev => Math.max(1, prev - 1));
    };

    const handleIncrease = () => {
        setCount(prev => Math.min(maxCount, prev + 1));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (isNaN(val)) {
            setCount(1);
        } else {
            setCount(Math.min(Math.max(val, 1), maxCount));
        }
    };

    const handleMax = () => setCount(maxCount);
    const handleHalf = () => setCount(Math.ceil(maxCount / 2));

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-lg mx-4 bg-base-100 rounded-2xl shadow-2xl transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`}>
                <div className="p-6 bg-gradient-to-b from-base-100 to-base-200 rounded-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Layers className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Select Card Count</h3>
                                <p className="text-sm text-base-content/60">Base ID: {data.baseId}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-sm btn-circle hover:bg-error/20 hover:text-error transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
                            <p className="text-sm text-success/70 mb-1 font-medium">Total Available</p>
                            <p className="text-3xl font-bold text-success">{data.totalAvailable}</p>
                        </div>
                        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                            <p className="text-sm text-primary/70 mb-1 font-medium">Selected</p>
                            <p className="text-3xl font-bold text-primary">{count}</p>
                        </div>
                    </div>

                    {/* Preview Chips */}
                    {data.cardsPreview && data.cardsPreview.length > 0 && (
                        <div className="mb-6">
                            <p className="text-sm text-base-content/70 mb-3 flex items-center gap-2 font-medium">
                                <Package className="w-4 h-4" />
                                Available Cards Preview:
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-base-200 rounded-lg border border-base-300">
                                {data.cardsPreview.map((card, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCount(idx + 1)}
                                        className={`badge badge-lg cursor-pointer transition-all hover:scale-110 ${
                                            idx < count
                                                ? 'badge-primary shadow-md shadow-primary/30'
                                                : 'badge-ghost opacity-50 hover:opacity-80'
                                        }`}
                                        title={`Power: ${card.power || '?'}`}
                                    >
                                        #{card.id}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Counter Control */}
                    <div className="bg-base-200 rounded-2xl p-6 mb-6 border border-base-300">
                        <div className="flex items-center justify-between gap-4">
                            <button
                                className="btn btn-circle btn-lg btn-primary disabled:opacity-50"
                                onClick={handleDecrease}
                                disabled={count <= 1}
                            >
                                <Minus className="w-6 h-6" />
                            </button>

                            <div className="flex-1 text-center">
                                <input
                                    type="number"
                                    min={1}
                                    max={maxCount}
                                    value={count}
                                    onChange={handleInputChange}
                                    className="input input-ghost text-center text-4xl font-bold w-full bg-transparent focus:bg-base-100 focus:outline-none"
                                />
                                <p className="text-xs text-base-content/50 mt-2">Type to change quickly</p>
                            </div>

                            <button
                                className="btn btn-circle btn-lg btn-primary disabled:opacity-50"
                                onClick={handleIncrease}
                                disabled={count >= maxCount}
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex justify-center mt-4 gap-2">
                            <button
                                className="btn btn-sm btn-ghost hover:bg-base-300"
                                onClick={handleHalf}
                            >
                                Half ({Math.ceil(maxCount / 2)})
                            </button>
                            <button
                                className="btn btn-sm btn-accent"
                                onClick={handleMax}
                            >
                                Max ({maxCount})
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="alert alert-info/20 alert-info mb-6 text-sm border-info/30">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-info-content">Limited to your available balance: <strong>{maxCount} cards</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            className="btn btn-ghost flex-1 hover:bg-base-300"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!isValid || count === 0}
                            onClick={() => {
                                if (isValid) {
                                    onConfirm(count);
                                }
                            }}
                            className={`
                                flex-1 gap-2 btn-lg 
                                ${!isValid || count === 0
                                ? "btn btn-disabled btn-outline opacity-50"
                                : "btn btn-primary shadow-lg shadow-primary/30 hover:shadow-primary/50"
                            }
                            `}
                        >
                            <ArrowRightLeft className="w-5 h-5" />
                            Transfer {count} Card{count > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}