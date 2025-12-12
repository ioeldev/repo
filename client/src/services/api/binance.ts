import { type FetchPairsResponse } from "@/types/auth";
import { apiClient } from "./client";

export const binanceService = {
    fetchPairs: async () => {
        return apiClient.get<FetchPairsResponse>("/binance/pairs");
    },
};
