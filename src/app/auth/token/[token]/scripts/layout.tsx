import React from "react";
import AccessGuard from "./AccessGuard";

export default function RootLayout({
                                       children,
                                       params,
                                   }: {
    children: React.ReactNode;
    params: Promise<{ token: string }>;
}) {
    return (
        <div className="h-screen rtl w-md flex-col flex items-center justify-center">
            <AccessGuard />

            {children}
        </div>
    );
}
