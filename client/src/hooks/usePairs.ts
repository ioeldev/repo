import { useQuery } from "@tanstack/react-query";
import { binanceService } from "@/services/api";

export const usePairs = (enabled: boolean = true) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["binancePairs"],
        queryFn: async () => {
            const response = await binanceService.fetchPairs();
            return response;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // TODO: Implement real-time price updates via WebSocket
    // - Subscribe to ticker streams for all pairs
    // - Update prices in real-time
    // - Handle price formatting and calculations

    return {
        pairs: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
