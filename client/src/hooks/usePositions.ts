import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { positionsService } from "@/services/api";
import type { CreatePositionPayload, ClosePositionPayload } from "@/services/api";

/**
 * Hook to fetch user's positions with pagination
 * Returns positions data and pagination metadata
 *
 * Returns:
 * - positions: Array of user positions
 * - pagination: Pagination metadata (page, limit, total, totalPages)
 * - isLoading: Loading state
 * - error: Error object if fetch failed
 * - refetch: Function to manually refetch positions
 * - createPosition: Mutation function to create a new position
 * - isCreating: Loading state for create mutation
 *
 * Example:
 * const { positions, pagination, isLoading, createPosition } = usePositions(1, 20);
 */
export const usePositions = (
    page: number = 1,
    limit: number = 20,
    status?: "open" | "closed",
    enabled: boolean = true
) => {
    const token = localStorage.getItem("access_token");
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["positions", page, limit, status],
        queryFn: async () => {
            const response = await positionsService.getMyPositions(page, limit, status);
            return response;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 30, // 30 seconds
    });

    // Mutation for creating a new position
    const createPositionMutation = useMutation({
        mutationFn: async (payload: CreatePositionPayload) => {
            return await positionsService.createPosition(payload);
        },
        onSuccess: () => {
            // Invalidate and refetch positions query to show the new position
            queryClient.invalidateQueries({
                queryKey: ["positions"],
            });

            // Also refetch position stats
            queryClient.invalidateQueries({
                queryKey: ["position-stats"],
            });
        },
        onError: (error: any) => {
            console.error("Failed to create position:", error);
        },
    });

    // Mutation for closing a position
    const closePositionMutation = useMutation({
        mutationFn: async (payload: ClosePositionPayload) => {
            return await positionsService.closePosition(payload);
        },
        onSuccess: () => {
            // Invalidate and refetch positions query to update the closed position
            queryClient.invalidateQueries({
                queryKey: ["positions"],
            });

            // Also refetch position stats
            queryClient.invalidateQueries({
                queryKey: ["position-stats"],
            });
        },
        onError: (error: any) => {
            console.error("Failed to close position:", error);
        },
    });

    return {
        positions: query.data?.data || [],
        pagination: query.data?.pagination || { page: 1, limit, total: 0, totalPages: 0 },
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        createPosition: createPositionMutation.mutate,
        createPositionAsync: createPositionMutation.mutateAsync,
        isCreating: createPositionMutation.isPending,
        createError: createPositionMutation.error,
        createData: createPositionMutation.data,
        closePosition: closePositionMutation.mutate,
        closePositionAsync: closePositionMutation.mutateAsync,
        isClosing: closePositionMutation.isPending,
        closeError: closePositionMutation.error,
        closeData: closePositionMutation.data,
    };
};
