'use client';

import { createContext, useContext } from 'react';

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

export const TelegramAuthContext = createContext<TelegramAuthContextType>({
    user: null,
    loading: true
});

export const useTelegramAuth = () => useContext(TelegramAuthContext);