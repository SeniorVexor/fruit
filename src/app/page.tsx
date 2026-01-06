'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useState } from 'react';

import Link from "next/link";

export default function HomePage() {
    const router = useRouter();
    const [token, setToken] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedToken = token.trim();
        if (trimmedToken) {
            router.push(`/auth/token/${encodeURIComponent(trimmedToken)}/scripts`);
        }

    };

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-base-200 px-4">
            <div className="w-full max-w-md">
                <Icon icon="lucide:bot" className="w-20 h-20 mx-auto mb-4 text-primary sm:w-24 sm:h-24"  />

                <h1 className="text-3xl sm:text-5xl font-bold text-center mb-6">
                    Ex Panel
                </h1>

                <form onSubmit={handleSubmit}>
                    <fieldset className="overflow-hidden fieldset bg-base-200 border-base-300 rounded-box border p-4 m-0">
                        <legend className="fieldset-legend text-lg sm:text-xl">
                            ورود به پنل با توکن
                        </legend>

                        <input
                            name='EX-Token'
                            type="text"
                            className="input w-full"
                            placeholder="****-****-****"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            required
                        />

                        <p className="label text-xs sm:text-sm m-0">
                            برای امنیت حساب خود لطفاً توکن را در اختیار کسی نگذارید
                        </p>

                        <p className="label text-xs sm:text-sm m-0">
                            اگر توکن را ندارید ربات را /start کنید و اشتراک بگیرید
                        </p>

                        <button type="submit" className="btn btn-neutral mt-4 w-full">
                            Login
                        </button>
                    </fieldset>
                </form>
                <div className="mt-6">
                    <div className="divider text-xs">یا ورود با</div>

                    <div className="grid gap-3">
                        <Link
                            href="#"
                            className="group flex items-center justify-center gap-3 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm font-medium transition hover:bg-base-300"
                        >
                            <Icon icon="tabler:brand-google" className="h-5 w-5" />
                            ورود با Google
                        </Link>

                        <Link
                            href="#"
                            className="group flex items-center justify-center gap-3 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm font-medium transition hover:bg-base-300"
                        >
                            <Icon icon="tabler:brand-x" className="h-4 w-4 text-current" />
                            ورود با X
                        </Link>

                        {/*<Link*/}
                        {/*    href="#"*/}
                        {/*    className="group flex items-center justify-center gap-3 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm font-medium transition hover:bg-base-300"*/}
                        {/*>*/}
                        {/*    <Icon icon="logos:telegram" className="h-5 w-5" />*/}
                        {/*    ورود با Telegram*/}
                        {/*</Link>*/}




                    </div>
                </div>
            </div>
        </div>
    );
}
