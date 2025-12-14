import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";

export const useDepositsWithdraws = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "deposits-withdraws"],
    queryFn: async () => {
      const response = await usersService.getAllDepositsAndWithdraws();
      return response.data;
    },
  });

  return {
    data: data || { deposits: [], withdraws: [] },
    isLoading,
    error,
    refetch,
  };
};
