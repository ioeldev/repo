import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/api";

export const useUsers = (enabled: boolean = true) => {
    const token = localStorage.getItem("access_token");

    const query = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const response = await usersService.getAll();
            return response;
        },
        enabled: enabled && !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        users: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
