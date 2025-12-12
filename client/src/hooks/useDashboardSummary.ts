import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/api";
import type { DashboardSummary } from "@/types/auth";

/**
 * Hook to fetch and cache dashboard summary
 * Provides pre-calculated portfolio data from the backend
 *
 * Returns:
 * - summary: DashboardSummary with wallet, trading, robots, investments, and portfolio data
 * - isLoading: Loading state
 * - error: Error object if fetch failed
 *
 * Example:
 * const { summary, isLoading } = useDashboardSummary();
 * console.log(summary.portfolio.total_balance);
 */
export const useDashboardSummary = (enabled: boolean = true) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["dashboard-summary"],
        queryFn: async () => {
            const response = await authService.getDashboardSummary();
            return response.data.summary;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        summary:
            query.data ||
            ({
                wallet: { btc: 0, usdt: 0, eur: 0, total_in_usd: 0 },
                trading: { balance: 0, open_pnl: 0, closed_pnl: 0, fees_paid: 0, total_balance: 0 },
                robots: { balance: 0, earnings: 0, total_balance: 0 },
                investments: { balance: 0, earnings: 0, total_balance: 0 },
                portfolio: {
                    total_balance: 0,
                    total_performance: 0,
                    allocation: { trading: 0, robots: 0, investments: 0 },
                },
            } as DashboardSummary),
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
