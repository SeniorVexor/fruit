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
        <html lang="fa">
        <body className={vazir.className} dir={'rtl'}>
        <main className="min-h-screen rtl w-full flex bg-base-200 items-center justify-center">
            {children}
        </main>
        </body>
        </html>
    );
}
