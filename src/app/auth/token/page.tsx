'use client'; // برای استفاده از useRouter و useState

import { useRouter } from 'next/navigation'; // درست برای App Router
import { Bot, PlayCircle, Shield } from 'lucide-react';
import { useState } from "react";

export default function HomePage() {
    const router = useRouter();
    const [token, setToken] = useState('');

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        const trimmedToken = token.trim();
        if (trimmedToken) {
            router.push(`/auth/token/${encodeURIComponent(trimmedToken)}/`);
        }
    };

    return (
        <div className="hero min-h-screen bg-base-200">
            <div className="hero-content text-center">
                <div className="max-w-md" >
                    <Bot className="w-24 h-24 mx-auto mb-6 text-primary" />
                    <h1 className="text-5xl font-bold mb-4">Ex Panel</h1>
                    <p className="text-lg mb-8"></p>

                    <div className="flex flex-col gap-4">
                        <fieldset onSubmit={handleSubmit} className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
                            <legend className="fieldset-legend textarea-xl">ورود به پنل با توکن</legend>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="****-****-****"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                            />
                            <p className="label">برای امنیت حساب خود لطفا توکن رو در اختیار کسی نگذارید</p>
                            <p className="label">اگر توکن را ندارید ربات را /start کنید و اقدام به دریافت اشتراک کنید</p>
                            <button type="submit" className="btn btn-neutral mt-4 w-full">Login</button>
                        </fieldset>
                    </div>
                </div>
            </div>
        </div>
    );
}