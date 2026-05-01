// types.ts
export interface CardPreview {
    id: string;
    name: string;
    power: number;
    rarity: string;
}

export interface TransferRequest {
    base_id: string;
    recipient: string;
    count?: number;
    useBaseId: boolean;
}

export interface TransferResponse {
    success: boolean;
    data?: {
        transferred_cards?: string[];
        summary?: {
            total_available: number;
            card_name: string;
            cards_preview: CardPreview[];
        };
    };
    error?: {
        message: string;
        code?: string;
        details?: unknown;
    };
}

export interface CountModalData {
    baseId: string;
    cardName: string;
    totalAvailable: number;
    cardsPreview: CardPreview[];
    maxTransferLimit: number;
}
