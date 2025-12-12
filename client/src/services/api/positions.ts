import { apiClient } from "./client";
import type { User } from "@/types/auth";

export interface PnLHistoryDataPoint {
    date: string;
    pnl: number;
}

export interface PnLHistoryResponse {
    success: boolean;
    data: PnLHistoryDataPoint[];
}

export interface PositionStats {
    btc: { pnl: number; openCount: number; closedCount: number };
    usdt: { pnl: number; openCount: number; closedCount: number };
    eur: { pnl: number; openCount: number; closedCount: number };
    total: { pnl: number; pnlInEur: number; openCount: number; closedCount: number };
}

export interface PositionStatsResponse {
    success: boolean;
    data: {
        stats: PositionStats;
        balances: {
            btc: number;
            usdt: number;
            eur: number;
        };
        btcPrice: number;
        totalPositions: number;
    };
}

export interface Position {
    _id: string;
    user_id: string;
    symbol: string;
    manual_symbol: string;
    base_currency: string;
    base_currency_amount: number;
    quantity: number;
    entry_price: number;
    entry_time: string;
    exit_price?: number;
    exit_time?: string;
    status: "open" | "closed";
    type: "buy" | "sell";
    leverage: number;
    liquidation_price: number;
    position_size: number;
    liquidated?: boolean;
    take_profit?: number;
    stop_loss?: number;
    fees?: number;
    pnl?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface AdminPosition extends Position {
    user: User;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PositionsResponse {
    success: boolean;
    data: Position[];
    pagination: PaginationMeta;
}

export interface AdminPositionsResponse {
    success: boolean;
    data: AdminPosition[];
    pagination: PaginationMeta;
}

export interface CreatePositionPayload {
    symbol: string;
    manual_symbol: string;
    quantity: number;
    entry_price: number;
    entry_time?: string;
    base_currency: string;
    base_currency_amount: number;
    type: "buy" | "sell";
    leverage: number;
    position_size: number;
    take_profit?: number;
    stop_loss?: number;
    confirmReversal?: boolean;
    status?: "open" | "closed";
    exit_price?: number;
    exit_time?: string;
}

export interface CreatePositionResponse {
    success: boolean;
    data: Position;
    message?: string;
    reversalRequired?: boolean;
}

export interface AdminCreatePositionPayload extends CreatePositionPayload {
    user_id: string;
}

export interface ClosePositionPayload {
    position: {
        _id: string;
        exit_price: number;
        exit_time: string;
    };
}

export interface ClosePositionResponse {
    success: boolean;
    data: Position & { pnl?: number };
}

export interface AdminPositionsFilters {
    user_id?: string;
    status?: "open" | "closed";
    symbol?: string;
    base_currency?: string;
    type?: "buy" | "sell";
}

export interface AdminPositionsParams {
    skip?: number;
    limit?: number;
    search?: string;
    sorting?: Array<{ field: string; order: 1 | -1 }>;
    filters?: AdminPositionsFilters;
}

export interface UpdatePositionPayload {
    symbol?: string;
    manual_symbol?: string;
    quantity?: number;
    entry_price?: number;
    exit_price?: number;
    base_currency?: string;
    base_currency_amount?: number;
    type?: "buy" | "sell";
    leverage?: number;
    position_size?: number;
    take_profit?: number;
    stop_loss?: number;
    liquidation_price?: number;
}

export interface DeletePositionResponse {
    success: boolean;
    message?: string;
}

export const positionsService = {
    getPnLHistory: async (): Promise<PnLHistoryResponse> => {
        return apiClient.get<PnLHistoryResponse>("/positions/v2/pnl-history");
    },

    getStats: async (): Promise<PositionStatsResponse> => {
        return apiClient.get<PositionStatsResponse>("/positions/v2/stats");
    },

    getMyPositions: async (
        page: number = 1,
        limit: number = 20,
        status?: "open" | "closed"
    ): Promise<PositionsResponse> => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (status) {
            params.append("status", status);
        }
        return apiClient.get<PositionsResponse>(`/positions/v2?${params.toString()}`);
    },

    createPosition: async (payload: CreatePositionPayload): Promise<CreatePositionResponse> => {
        return apiClient.post<CreatePositionResponse>("/positions/v2", payload);
    },

    adminCreatePosition: async (payload: AdminCreatePositionPayload): Promise<CreatePositionResponse> => {
        return apiClient.post<CreatePositionResponse>("/positions/v2/admin", payload);
    },

    adminCreatePositions: async (payload: CreatePositionPayload[]): Promise<CreatePositionResponse[]> => {
        return apiClient.post<CreatePositionResponse[]>("/positions/v2/admin/batch", payload);
    },

    closePosition: async (payload: ClosePositionPayload): Promise<ClosePositionResponse> => {
        return apiClient.post<ClosePositionResponse>("/positions/v2/close", payload);
    },

    // Admin endpoints
    getAdminPositions: async (params: AdminPositionsParams): Promise<AdminPositionsResponse> => {
        const queryParams = new URLSearchParams();

        if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
        if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.sorting) queryParams.append("sorting", JSON.stringify(params.sorting));
        if (params.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
                if (value !== undefined) queryParams.append(`filters[${key}]`, value.toString());
            });
        }

        return apiClient.get<AdminPositionsResponse>(`/positions/v2/admin?${queryParams.toString()}`);
    },

    updateAdminPosition: async (positionId: string, payload: UpdatePositionPayload): Promise<Position> => {
        return apiClient.put<Position>(`/positions/v2/admin/${positionId}`, payload);
    },

    deleteAdminPosition: async (positionId: string): Promise<DeletePositionResponse> => {
        return apiClient.delete<DeletePositionResponse>(`/positions/v2/admin/${positionId}`);
    },

    closeAdminPosition: async (positionId: string, exitPrice: number): Promise<ClosePositionResponse> => {
        return apiClient.post<ClosePositionResponse>(`/positions/v2/admin/${positionId}/close`, {
            exit_price: exitPrice,
            exit_time: new Date().toISOString(),
        });
    },
};
