'use client';

import { useState } from 'react';
import {
    Search, Key, ArrowRight, Terminal, Shield,
    Users, Trophy, Play, X, Loader2
} from 'lucide-react';
import { formatCompactNumber } from "@/lib/utils";
import Link from "next/link";

// --- انواع داده ---
interface Tribe {
    id: number;
    name: string;
    description: string;
    score: number;
    rank: number;
    member_count: number;
}
type JoinStatusType = 'loading' | 'success' | 'invalid_RestoreKey' | 'undecided_request' | 'already_in_tribe' | 'error';

// --- کامپوننت Modal برای نمایش وضعیت Join ---
const JoinModal = ({
                       isOpen,
                       onClose,
                       status,
                       tribeName,
                       onLeaveTribe // تابعی برای خروج از قبیله (اختیاری، فعلا فقط پیام می‌دهد)
                   }: {
    isOpen: boolean;
    onClose: () => void;
    status: JoinStatusType;
    tribeName?: string;
    onLeaveTribe?: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box text-center">

                {/* 1. Loading */}
                {status === 'loading' && (
                    <>
                        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                        <h3 className="font-bold text-lg text-primary">در حال پردازش...</h3>
                        <p className="py-4">درخواست شما به سرور بازی ارسال شد.</p>
                    </>
                )}

                {/* 2. Success (موفقیت) */}
                {status === 'success' && (
                    <>
                        <div className="text-success mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-success">تبریک!</h3>
                        <p className="py-4">شما عضو قبیله <b>{tribeName}</b> شدید.</p>
                        <div className="modal-action justify-center">
                            <button className="btn btn-success" onClick={onClose}>عالی</button>
                        </div>
                    </>
                )}

                {/* 3. Undecided Request (درخواست معلق) */}
                {status === 'invalid_RestoreKey' && (
                    <>
                        <div className="text-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-warning">کلید بازیابی نامعتبر</h3>
                        <p className="py-4">
                            کلید بازیابی وارد شده نامعتبر است.
                            <br/><span className="text-xs opacity-70">(Invalid Restore Key)</span>
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>متوجه شدم</button>
                            <button className="btn btn-warning" onClick={onClose}>سعی مجدد</button>
                        </div>
                    </>
                )}

                {/* 3. Undecided Request (درخواست معلق) */}
                {status === 'undecided_request' && (
                    <>
                        <div className="text-warning mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-warning">در انتظار تایید</h3>
                        <p className="py-4">
                            شما قبلاً یک درخواست عضویت برای این قبیله فرستاده‌اید که هنوز تایید یا رد نشده است.
                            <br/><span className="text-xs opacity-70">(Undecided Request)</span>
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>متوجه شدم</button>
                            <button className="btn btn-warning" onClick={onClose}>سعی مجدد</button>
                        </div>
                    </>
                )}

                {/* 4. Already In Tribe (قبلا عضو هستید) */}
                {status === 'already_in_tribe' && (
                    <>
                        <div className="text-info mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-info">شما عضو قبیله دیگری هستید</h3>
                        <p className="py-4">
                            شما هم‌اکنون عضو یک قبیله هستید. برای عضویت در <b>{tribeName}</b> باید از قبیله فعلی خارج شوید.
                        </p>
                        <div className="modal-action justify-center gap-2">
                            <button className="btn btn-ghost" onClick={onClose}>لغو</button>
                            {/* اینجا می‌توانید بعداً تابع خروج از قبیله را صدا بزنید */}
                            <button className="btn btn-error" onClick={() => {
                                alert("دکمه خروج از قبیله هنوز پیاده نشده است.");
                                onClose();
                            }}>خروج از قبیله فعلی</button>
                        </div>
                    </>
                )}

                {/* 5. General Error */}
                {status === 'error' && (
                    <>
                        <div className="text-error mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="font-bold text-lg text-error">خطا</h3>
                        <p className="py-4">مشکلی در برقراری ارتباط رخ داد.</p>
                        <div className="modal-action justify-center">
                            <button className="btn" onClick={onClose}>بستن</button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default function TribePage() {
    const [step, setStep] = useState(1); // 1: Key, 2: Search, 3: Terminal
    const [restoreKey, setRestoreKey] = useState('');

    // Search States (قبلی)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Tribe[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // ✅ استیت‌های جدید برای Modal Join
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [joinStatus, setJoinStatus] = useState<JoinStatusType>('loading');
    const [selectedTribeName, setSelectedTribeName] = useState('');

    // Terminal States (می‌توانید بگذارید اگر جایی دیگر نیاز شد)
    const [terminalOutput, setTerminalOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);



    // --- Handlers ---

    const handleKeySubmit = () => {
        if (restoreKey.trim()) setStep(2);
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchResults([]);
        setTerminalOutput('');

        try {
            const response = await fetch('/api/tribe/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: restoreKey,
                    mode: 'search',
                    target: searchQuery
                }),
            });

            if (!response.ok) throw new Error('Network error');

            const reader = response.body?.getReader();
            // console.log(reader)
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    buffer += text;

                    // --- تغییری که اینجا دادم ---
                    const startTag = '---RESULT_START---';
                    const endTag = '---RESULT_END---';
                    //
                    const startIdx = buffer.indexOf(startTag);
                    const endIdx = buffer.indexOf(endTag);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const jsonStr = buffer.substring(startIdx + startTag.length, endIdx).trim();
                        try {
                            const data = JSON.parse(jsonStr);

                            // ✅ اصلاحیه اصلی: چک کردن اینکه آیا data.tribes وجود دارد؟
                            // چون خروجی پایتون { "tribes": [...] } است
                            if (data && Array.isArray(data.tribes)) {
                                setSearchResults(data.tribes);
                            } else if (Array.isArray(data)) {
                                // اگر مستقیما آرایه بود (برای آینده)
                                setSearchResults(data);
                            } else {
                                console.error("Unknown structure:", data);
                                setSearchResults([]);
                            }

                        } catch (e) {
                            console.error('Parse Error', e);
                        }
                        break;
                    }
                }
            }

        } catch (error) {
            console.error('Search failed', error);
            alert('خطا در جستجو. لطفا کلید و اینترنت را چک کنید.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleJoin = async (tribe: Tribe) => {
        setSelectedTribeName(tribe.name);
        setJoinStatus('loading');
        setIsModalOpen(true);

        try {
            const response = await fetch('/api/tribe/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: restoreKey,
                    mode: 'join',
                    target: tribe.id
                }),
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let joinStatusFound = false;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    buffer += text;

                    // 1. چک کردن نتیجه Join
                    const startTag = '---JOIN_RESULT---';
                    const endTag = '---JOIN_END---';

                    const startIdx = buffer.indexOf(startTag);
                    const endIdx = buffer.indexOf(endTag);

                    if (startIdx !== -1 && endIdx !== -1) {
                        const jsonStr = buffer.substring(startIdx + startTag.length, endIdx).trim();
                        try {
                            const result = JSON.parse(jsonStr);

                            if (result.status === 'success') {
                                setJoinStatus('success');
                            } else if (result.status === 'undecided_request') {
                                setJoinStatus('undecided_request');
                            } else if (result.status === 'already_in_tribe') {
                                setJoinStatus('already_in_tribe');
                            } else {
                                setJoinStatus('error');
                            }

                            joinStatusFound = true;
                            break;
                        } catch (e) {
                            console.error('JSON Parse Error in Join', e);
                        }
                    }
                }
            }

            // اگر خروجی تمام شد ولی نتیجه Join پیدا نشد (خطای ناشناخته)
            if (!joinStatusFound) {
                setJoinStatus('error');
            }

        } catch (error) {
            console.error('Network/Script Error', error);
            setJoinStatus('error');
        }
    };

    // --- UI Components ---

    return (
        <div className="items-center justify-center  p-4 font-sans w-full">
            <div className="mx-auto">

                {/* STEP 1: Input Key */}
                {step === 1 && (
                    <div className="card bg-base-100 shadow-xl max-w-md mx-auto mt-10">
                        <div className="card-body items-center text-center">
                            <div className="p-4 bg-primary/10 rounded-full mb-4">
                                <Key className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="card-title text-2xl">احراز هویت</h2>
                            <p className="text-sm text-gray-500 mb-6">کلید بازیابی اکانت خود را وارد کنید</p>

                            <input
                                type="text"
                                name="EX-restoreKey"
                                placeholder="Restore Key (مثال: gold9...)"
                                className="input input-bordered w-full mb-4 font-mono"
                                value={restoreKey}
                                onChange={(e) => setRestoreKey(e.target.value)}
                            />

                            <button
                                className="btn btn-primary w-full"
                                disabled={!restoreKey}
                                onClick={handleKeySubmit}
                            >
                                ورود <ArrowRight className="w-4 h-4 mr-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Search & Select */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="card bg-base-100 shadow-sm p-4 flex justify-between items-center">
                            <span className="font-mono text-sm opacity-70 truncate max-w-[200px]">{restoreKey}</span>
                            <button className="btn btn-ghost btn-xs" onClick={() => setStep(1)}>تغییر کلید</button>
                        </div>

                        {/* Search Bar */}
                        <div className="join w-full shadow-md">
                            <input
                                className="input input-bordered join-item w-full"
                                placeholder="نام قبیله را جستجو کنید..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                className={`btn join-item btn-primary ${isSearching ? 'loading' : ''}`}
                                onClick={handleSearch}
                            >
                                {!isSearching && <Search className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Results Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isSearching && (
                                <div className="col-span-full py-10 text-center">
                                    <Loader2 className="animate-spin mx-auto text-primary mb-2" />
                                    <span className="text-sm opacity-70">در حال جستجو...</span>
                                </div>
                            )}

                            {!isSearching && searchResults.length > 0 && searchResults.map((tribe) => (
                                <div key={tribe.id} className="card bg-base-100 border border-base-200 hover:border-primary transition-all">
                                    <div className="card-body p-4">
                                        <div className="flex justify-between ">
                                            <h3 className="font-bold text-lg">{tribe.name}</h3>
                                            <div className="badge badge-ghost">#{tribe.rank}</div>
                                        </div>
                                        <p className="text-xs text-gray-500 border-base-200 border-b-2 pb-2 truncate">{tribe.description}</p>
                                        <div className="flex gap-6 text-sm shadow-inner p-2 rounded-box max-h-28">
                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-primary mb-1"><Users className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.member_count)}</div>
                                                <div className="text-lg">عضو</div>
                                            </div>


                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-secondary mb-1"><Trophy className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.score)}</div>
                                                <div className="text-lg">امتیاز</div>
                                            </div>

                                            <div className="py-4 px-0 m-0 rounded-box flex w-1/3 flex-col bg-base-200 items-center justify-center">
                                                <div className="text-success mb-1"><Trophy className="w-6 h-6"/></div>
                                                <div className="text-lg">{formatCompactNumber(tribe.score)}</div>
                                                <div className="text-lg">امتیاز</div>
                                            </div>
                                        </div>

                                        <div className="card-actions justify-end border-base-200 border-t-2 pt-3 ">
                                            <button
                                                className="btn btn-sm btn-primary w-full gap-2"
                                                onClick={() => handleJoin(tribe)}
                                            >
                                                <Play className="w-3 h-3" /> عضویت در قبیله
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <div className="col-span-full text-center py-10 opacity-50">
                                    موردی یافت نشد.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Terminal / Running */}
                {step === 3 && (
                    <div className="card bg-[#1e1e1e] text-green-400 shadow-2xl min-h-[400px] flex flex-col font-mono text-sm overflow-hidden">
                        <div className="bg-[#2d2d2d] p-2 flex justify-between items-center border-b border-gray-700">
                            <div className="flex gap-2 items-center">
                                <Terminal className="w-4 h-4" />
                                <span className="text-xs">Drone Script Output</span>
                            </div>
                            {isRunning && <span className="loading loading-spinner loading-xs text-success"></span>}
                        </div>

                        <div className="p-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
                            {terminalOutput}
                            {isRunning && <span className="animate-pulse">_</span>}
                        </div>

                        <div className="p-2 bg-[#2d2d2d] border-t border-gray-700 text-center">
                            <button
                                className="btn btn-sm btn-ghost text-red-400"
                                onClick={() => setStep(2)}
                                disabled={isRunning}
                            >
                                بستن ترمینال
                            </button>
                        </div>
                    </div>
                )}

            </div>
            <JoinModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                status={joinStatus}
                tribeName={selectedTribeName}
            />
            <Link
                type="button"
                href="."
                // onClick={() => router.push('/..')}
                className="w-full btn btn-ghost items-center justify-center gap-3 rounded-box border-2 border-base-100 bg-base-200 px-4 py-3 my-3 text-sm font-medium"
            >
                <ArrowRight className="w-4 h-4 rotate-180" />
                بازگشت
            </Link>
        </div>
    );
}