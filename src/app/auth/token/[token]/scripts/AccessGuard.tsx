// app/auth/token/[token]/scripts/AccessGuard.tsx
"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import scriptsConfig from "@/../config/scripts.json";

export default function AccessGuard() {
    const params = useParams();
    const token = params?.token as string;
    const pathname = usePathname();
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // فقط برای مسیرهایی که زیرشاخه scripts دارند (مثل /scripts/miner) بررسی کن
        // خود مسیر /scripts را بررسی نکن (اجازه بده لیست نشان داده شود)
        const segments = pathname.split("/");
        const scriptsIndex = segments.indexOf("scripts");
        if (scriptsIndex === -1) return; // نباید اتفاق بیفتد
        const scriptName = segments[scriptsIndex + 1]; // بعد از scripts

        // اگر scriptName وجود نداشت (یعنی دقیقاً /scripts است) نیازی به بررسی نیست
        if (!scriptName) {
            setChecking(false);
            return;
        }

        const checkAccess = async () => {
            try {
                // 1. بررسی وجود اسکریپت در کانفیگ و فعال بودن
                const script = (scriptsConfig as any)[scriptName];
                // console.log(script);
                if (!script || !script.available) {
                    router.replace("/auth/error/script-not-available");
                    return;
                }

                // 2. فراخوانی API برای بررسی مجوز توکن
                const res = await fetch("/api/token-access", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "check",
                        token,
                        path: scriptName,
                    }),
                });

                if (res.status === 404) {
                    router.replace("/auth/error/invalid-token");
                    return;
                }
                if (!res.ok) {
                    throw new Error("Server error");
                }

                const data = await res.json();
                if (data.allowed !== true) {
                    router.replace("/auth/error/script-not-permitted");
                    return;
                }

                // مجاز است – اجازه نمایش children را بده
                setChecking(false);
            } catch (err) {
                console.error(err);
                router.replace("/auth/error/server-error");
            }
        };

        checkAccess();
    }, [pathname, token, router]);

    if (checking) {
        return (
            <div className="fixed inset-0 bg-base-200 flex items-center justify-center z-50">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return null;
}