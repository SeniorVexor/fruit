export type LogType = 'success' | 'error' | 'warning' | 'info';

export type ErrorCode =
    | 'VAL_001' | 'VAL_002' | 'VAL_003'
    | 'SYS_001' | 'SYS_002' | 'SYS_003' | 'SYS_004' | 'SYS_005'
    | 'AVL_001'
    | 'TRF_001';

export interface TransferLog {
    timestamp: string;
    message: string;
    type: LogType;
}

export interface CardPreview {
    id: string | number;
    name?: string;
    mint_number?: number;
    rarity?: string;
    quality?: string;
    power?: number;
    base_id?: string;
}

export interface SummaryData {
    base_id: string;
    cards: CardPreview[];
    total?: number;
    success?: number;
    failed?: number;
    message?: string;
}

// فقط یک تعریف برای TransferResponse (تعریف اول حذف شده)
export interface TransferResponse {
    success: boolean;
    error_code?: ErrorCode | string | null;  // از تعریف اول اضافه شد
    message?: string;  // از تعریف اول اضافه شد
    data?: {
        summary?: SummaryData;
        result?: {
            success_count: number;
            fail_count: number;
            transferred_cards: any[];
            failed_cards?: any[];
            summary?: SummaryData;
        };
        logs?: TransferLog[];
    };
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    logs?: TransferLog[];
    summary?: SummaryData;
}

export interface CountModalData {
    baseId: string | number;
    totalAvailable: number;
    cardsPreview: CardPreview[];
    maxTransferLimit: number;
}
