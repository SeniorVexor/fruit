import React from "react";

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen rtl w-md flex-col flex  items-center justify-center">
            {children}
        </div>
    );
}
