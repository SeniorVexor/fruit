'use client';

import { ReactNode, useEffect, useState } from 'react';
import { TelegramAuthContext } from '@/contexts/TelegramAuthContext';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

interface TelegramAuthContextType {
    user: {
        telegramId: string;
        telegram?: TelegramUser;
        hasSubscription: boolean;
    } | null;
    loading: boolean;
}

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<TelegramAuthContextType['user']>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initTelegram = () => {
            const tg = (window as any).Telegram?.WebApp;

            if (!tg) {
                console.warn('Telegram WebApp not found');
                setLoading(false);
                return;
            }

            tg.ready();
            const initData = tg.initDataUnsafe;

            if (initData?.user?.id) {
                setUser({
                    telegramId: initData.user.id.toString(),
                    telegram: initData.user,
                    hasSubscription: false
                });
            }

            setLoading(false);
        };

        if (document.readyState === 'complete') {
            initTelegram();
        } else {
            window.addEventListener('load', initTelegram);
        }

        return () => window.removeEventListener('load', initTelegram);
    }, []);

    return (
        <TelegramAuthContext.Provider value={{ user, loading }}>
            {children}
        </TelegramAuthContext.Provider>
    );
}