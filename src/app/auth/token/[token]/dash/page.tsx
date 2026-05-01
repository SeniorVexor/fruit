// app/auth/token/[token]/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {Rocket, Grape, Swords, Play, ChevronRight, Package, Loader2, Pickaxe,CheckCircle,WifiOff} from 'lucide-react';
import scriptsConfig from '@/../config/scripts.json';
import React, { useEffect, useState } from 'react';

// نگاشت آیکون‌ها
const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
    Grape: Grape,
    Swords: Swords,
    Package: Package,
    Pickaxe: Pickaxe,
    // در صورت نیاز آیکون‌های دیگر را اضافه کنید
};

interface ScriptConfig {
    name: string;
    desc: string;
    icon: string;
    url: string;
    state: boolean;
    available: boolean;
}

const typedScriptsConfig = scriptsConfig as Record<string, ScriptConfig>;

export default function TokenAuthPage() {
    const params = useParams();
    const tokenFromUrl = params?.token as string;
    const [allowedPaths, setAllowedPaths] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tokenFromUrl) return;

        const fetchAccessList = async () => {
            try {
                const res = await fetch('/api/token-access', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'list', token: tokenFromUrl }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'خطا در دریافت مجوزها');
                }

                const data = await res.json();
                setAllowedPaths(data.allowedPaths || []);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'مشکل در ارتباط با سرور');
            } finally {
                setLoading(false);
            }
        };

        fetchAccessList();
    }, [tokenFromUrl]);

    // اعتبارسنجی اولیه توکن
    if (!tokenFromUrl) {
        throw new Error('Invalid access - token missing');
    }

    if (loading) {
        return (
            <div className="w-full bg-base-200 p-4 overflow-hidden overscroll-none min-h-screen flex items-center justify-center">
                <div className="card bg-base-100 shadow-xl max-w-md w-full p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-base-content/70">در حال بررسی دسترسی‌ها...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full bg-base-200 p-4 overflow-hidden overscroll-none min-h-screen flex items-center justify-center">
                <div className="card bg-base-100 shadow-xl max-w-md w-full p-8 text-center">
                    <div className="text-error text-lg mb-2">⛔ خطا</div>
                    <p className="text-base-content/70">{error}</p>
                    <Link href="/" className="btn btn-outline btn-sm mt-6">
                        بازگشت به خانه
                    </Link>
                </div>
            </div>
        );
    }

    // فیلتر اسکریپت‌های مجاز:
    // شرط اول: state === true
    // شرط دوم: نام کلید اسکریپت در allowedPaths وجود داشته باشد
    const allowedScripts = Object.entries(typedScriptsConfig).filter(([key, script]) => {
        return script.state === true && allowedPaths?.includes(key);
    });

    // اگر هیچ اسکریپت مجازی وجود نداشت
    const hasAnyScript = allowedScripts.length > 0;

    return (
        <div className="w-full bg-base-200 p-4 overflow-hidden overscroll-none min-h-screen flex items-center justify-center">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body">
                    <h1 className="card-title text-2xl justify-center mb-6">
                        <Rocket className="w-6 h-6" /> خوش آمدید!
                    </h1>

                    <div className="mb-4">
                        <p className="text-sm text-base-content/70">
                            وضعیت اشتراک: <span className="text-success">فعال</span>
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                            توکن: {tokenFromUrl.slice(0, 8)}...
                        </p>
                    </div>

                    <div className="divider">اسکریپت‌های در دسترس</div>

                    {!hasAnyScript ? (
                        <div className="alert alert-warning shadow-lg">
                            <div>
                                <span>⚠️</span>
                                <span>شما به هیچ اسکریپتی دسترسی ندارید. برای دریافت دسترسی با پشتیبانی تماس بگیرید.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {allowedScripts.map(([key, script]) => {
                                const IconComponent = iconComponents[script.icon];
                                const isAvailable = script.available === true;
                                return (
                                    <div key={key} className="card bg-base-200">
                                        <div className="card-body items-center text-center">
                                            <h3 className="card-title justify-center">
                                                {IconComponent && <IconComponent className="w-5 h-5 mr-1" />}
                                                {script.name}
                                                {isAvailable ? (
                                                    <CheckCircle className="w-4 h-4 text-success mr-1" />
                                                ) : (
                                                    <WifiOff className="w-4 h-4 text-error mr-1" />
                                                )}
                                            </h3>
                                            <p className="text-sm text-base-content/70 mt-2">{script.desc}</p>
                                            <div className="card-actions w-full justify-center mt-4">
                                                {isAvailable ? (
                                                    <Link href={`/auth/token/${tokenFromUrl}/scripts${script.url}`} className="btn w-full btn-primary btn-sm">
                                                        <Play className="w-4 h-4 ml-1" />
                                                        اجرای اسکریپت
                                                    </Link>
                                                ) : (
                                                    <button className="btn w-full btn-outline btn-sm cursor-not-allowed opacity-50" disabled>
                                                        <WifiOff className="w-4 h-4 ml-1" />
                                                        در دسترس نیست
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-base-300">
                        <p className="text-xs text-base-content/50 text-center">
                            دسترسی شما توسط سرور تأیید شده است. لینک‌ها فقط برای این نشست معتبر هستند.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
