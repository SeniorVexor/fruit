import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import React from "react";

const vazir = Vazirmatn({ subsets: ['arabic'] });

export const metadata: Metadata = {
    title: 'Fruit Bot - Script Runner',
    description: 'Run scripts with Telegram authentication',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fa" dir="rtl">
        <body className={vazir.className}>
        <main className="min-h-screen w-full bg-base-100 items-center justify-center">
            {children}
        </main>
        </body>
        </html>
    );
}
