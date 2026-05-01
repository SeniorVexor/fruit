'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, ArrowRight } from 'lucide-react';

export default function TokenEntryPage() {
    const [token, setToken] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            router.push(`/auth/token/${token.trim()}/dash`);
        }
    };

    return (
        <div className="bg-base-200 h-full   flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body items-center text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <Key className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="card-title text-2xl">ورود به پنل</h2>
                    <p className="text-sm text-gray-500 mb-6">توکن خود را وارد کنید</p>
                    <form onSubmit={handleSubmit} className="w-full">
                        <input
                            type="text"
                            placeholder="توکن خود را وارد کنید"
                            className="input input-bordered w-full mb-4 font-mono"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={!token.trim()}
                        >
                            ورود به داشبورد
                            <ArrowRight className="w-4 h-4 mr-2" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}