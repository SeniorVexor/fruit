import type { Metadata, Viewport } from 'next'; // 1. تایپ Viewport را اضافه کنید
// import { Vazirmatn } from 'next/font/google';
import './globals.css';
import React from "react";

// const vazir = Vazirmatn({ subsets: ['arabic'] });

export const metadata: Metadata = {
    title: 'Fruit Bot - Script Runner',
    description: 'Run scripts with Telegram authentication',
    // viewport: `width=device-width, initial-scale=1.0`, // 2. این خط را حذف کنید
};

// 3. شی viewport را به صورت جداگانه export کنید
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fa">
        {/* تگ meta viewport دیگر نیاز نیست، Next.js آن را خودکار مدیریت می‌کند */}
            <body className="m-0 p-0" dir={'rtl'}>
                {/* <main className=" max-h-[100dvh] rtl w-full flex bg-base-200 items-center justify-center"> */}
                {/* 4. کلاس‌های max-h را از main حذف کرده و به تگ body اضافه کنید */}
                <main className="rtl w-full flex bg-base-200 items-center justify-center">
                    {children}
                </main>
            </body>
        </html>
    );
}