import { useQuery } from "@tanstack/react-query";
import { positionsService, type PnLHistoryDataPoint } from "@/services/api";

/**
 * Hook to fetch and cache P&L history data
 * Returns cumulative P&L over time for the EvolutionChart
 *
 * Returns:
 * - data: Array of { date, pnl } data points
 * - isLoading: Loading state
 * - error: Error object if fetch failed
 *
 * Example:
 * const { data, isLoading } = usePnLHistory();
 */
export const usePnLHistory = (enabled: boolean = true) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["pnl-history"],
        queryFn: async () => {
            const response = await positionsService.getPnLHistory();
            return response.data;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        data: query.data || ([] as PnLHistoryDataPoint[]),
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
