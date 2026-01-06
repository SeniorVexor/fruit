'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {Rocket, Grape, Swords, Play ,ChessRook} from 'lucide-react';
import scriptsConfig from '@/../config/scripts.json';
import React from "react";

// برای هر آیکنی که در JSON اضافه می‌کنید، اینجا import و mapping اضافه کنید
const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
    Grape: Grape,
    Swords: Swords,
    ChessRook: ChessRook
};

interface ScriptConfig {
    name: string;
    desc: string;
    icon: string;
    url: string;
    state: boolean;
}

const typedScriptsConfig = scriptsConfig as Record<string, ScriptConfig>;

export default function TokenAuthPage() {
    const params = useParams();
    const tokenFromUrl = params?.token as string;

    // چک ساده توکن (که توسط proxy باید تضمین شده باشد)
    if (!tokenFromUrl) {
        throw new Error('Invalid access - token missing');
    }

    return (
        <div className="w-full bg-base-200 p-4">
            <div className="card bg-base-100 shadow-xl max-w-md w-full">
                <div className="card-body">
                    <h1 className="card-title text-2xl justify-center mb-6">
                        <Rocket className="w-6 h-6" /> خوش آمدید!
                    </h1>

                    <div className="mb-4">
                        <p className="text-sm text-base-content/70">
                            وضعیت اشتراک: <span className="text-success">فعال</span>
                        </p>
                    </div>

                    <div className="divider">انتخاب اسکریپت</div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        {Object.entries(typedScriptsConfig).map(([key, script]) => {
                            if (!script.state) return null; // فقط اسکریپت‌های فعال

                            const IconComponent = iconComponents[script.icon];

                            return (
                                <div
                                    key={key}
                                    className="card bg-base-200"
                                >
                                    <div className="card-body items-center text-center">
                                        <h3 className="card-title justify-center">
                                            {IconComponent && <IconComponent className="w-5 h-5 mr-1" />}
                                            {script.name}
                                        </h3>
                                        <p className="text-sm text-base-content/70 mt-2">{script.desc}</p>
                                        <div className="card-actions w-full justify-center mt-4">
                                            <Link
                                                href={`/auth/token/${tokenFromUrl}/scripts${script.url}`}
                                                className="btn w-full btn-primary btn-sm"
                                            >
                                                <Play />
                                                اجرای اسکریپت
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-base-300">
                        <p className="text-xs text-base-content/50 text-center">
                            توکن شما به صورت امن تایید شده. لینک‌ها فقط برای این نشست معتبر هستند.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}