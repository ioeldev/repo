import { useQuery } from "@tanstack/react-query";
import { positionsService } from "@/services/api";

/**
 * Hook to fetch and cache position statistics
 * Returns trading stats and wallet balances
 *
 * Returns:
 * - stats: Position statistics including P&L by currency
 * - balances: Current wallet balances (BTC, USDT, EUR)
 * - btcPrice: Current BTC price in USDT
 * - isLoading: Loading state
 * - error: Error object if fetch failed
 *
 * Example:
 * const { balances, isLoading } = usePositionStats();
 */
export const usePositionStats = (enabled: boolean = true) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["position-stats"],
        queryFn: async () => {
            const response = await positionsService.getStats();
            return response.data;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        stats: query.data?.stats || null,
        balances: query.data?.balances || { btc: 0, usdt: 0, eur: 0 },
        btcPrice: query.data?.btcPrice || 0,
        totalPositions: query.data?.totalPositions || 0,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
