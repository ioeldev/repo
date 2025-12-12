import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { positionsService, type AdminPositionsParams } from "@/services/api";

export const useAdminPositions = (params: AdminPositionsParams) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["admin-positions", params],
        queryFn: async () => {
            const response = await positionsService.getAdminPositions(params);
            return response;
        },
        enabled: !!token && (!params.filters?.user_id || !!params.filters.user_id),
        retry: 1,
        staleTime: 1000 * 30, // 30 seconds - positions change frequently
    });

    return {
        positions: query.data?.data || [],
        pagination: query.data?.pagination,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};

export const useCloseAdminPosition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ positionId, exitPrice }: { positionId: string; exitPrice: number }) =>
            positionsService.closeAdminPosition(positionId, exitPrice),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-positions"] });
        },
    });
};

export const useDeleteAdminPosition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (positionId: string) => positionsService.deleteAdminPosition(positionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-positions"] });
        },
    });
};

export const useUpdateAdminPosition = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ positionId, payload }: { positionId: string; payload: any }) =>
            positionsService.updateAdminPosition(positionId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-positions"] });
        },
    });
};
