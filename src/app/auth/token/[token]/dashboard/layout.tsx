import { ReactNode } from 'react';
import { TelegramAuthProvider } from '@/components/providers/TelegramAuthProvider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        // <TelegramAuthProvider>
            <div className="ovh p-4 md:p-8">
                {children}
            </div>
        // </TelegramAuthProvider>
    );
}