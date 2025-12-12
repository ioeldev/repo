import { useState, useCallback, useEffect } from "react";
import { AdminPositionsTable } from "@/components/admin/positions/AdminPositionsTable";
import {
    useAdminPositions,
    useCloseAdminPosition,
    useDeleteAdminPosition,
} from "@/hooks/admin/useAdminPositions";
import { usePairs } from "@/hooks/usePairs";
import type { PaginationState, SortingState, ColumnFiltersState } from "@tanstack/react-table";

export default function AdminPositions() {
    // Fetch initial pairs data for current prices
    const { pairs, isLoading: isPairsLoading } = usePairs();
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([{ id: "status", desc: true }]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    // Convert TanStack table state to API params
    const apiParams = {
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
        sorting:
            sorting.length > 0
                ? sorting.map((s) => ({
                      field: s.id,
                      order: (s.desc ? -1 : 1) as 1 | -1,
                  }))
                : undefined,
        filters:
            columnFilters.length > 0
                ? columnFilters.reduce(
                      (acc, filter) => {
                          acc[filter.id as keyof typeof acc] = filter.value as any;
                          return acc;
                      },
                      {} as {
                          user_id?: string;
                          status?: "open" | "closed";
                          symbol?: string;
                          base_currency?: string;
                          type?: "buy" | "sell";
                      }
                  )
                : undefined,
    };

    const { positions, pagination: paginationMeta, isLoading, refetch } = useAdminPositions(apiParams);
    const closePositionMutation = useCloseAdminPosition();
    const deletePositionMutation = useDeleteAdminPosition();

    const handleClosePosition = useCallback(
        async (positionId: string, exitPrice: number) => {
            await closePositionMutation.mutateAsync({ positionId, exitPrice });
            refetch();
        },
        [closePositionMutation, refetch]
    );

    const handleDeletePosition = useCallback(
        async (positionId: string) => {
            await deletePositionMutation.mutateAsync(positionId);
            refetch();
        },
        [deletePositionMutation, refetch]
    );

    // Debounce global filter
    useEffect(() => {
        const timer = setTimeout(() => {
            // Reset to first page when searching
            if (pagination.pageIndex !== 0) {
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [globalFilter]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Liste des positions</h1>
                    <p className="text-sm text-muted-foreground">Gérez toutes les positions des utilisateurs</p>
                </div>
            </div>

            <AdminPositionsTable
                positions={positions}
                pairs={pairs}
                isLoading={isLoading || isPairsLoading}
                pagination={pagination}
                sorting={sorting}
                columnFilters={columnFilters}
                globalFilter={globalFilter}
                totalRows={paginationMeta?.total || 0}
                onPaginationChange={setPagination}
                onSortingChange={setSorting}
                onColumnFiltersChange={setColumnFilters}
                onGlobalFilterChange={setGlobalFilter}
                onClosePosition={handleClosePosition}
                onDeletePosition={handleDeletePosition}
                isClosing={closePositionMutation.isPending}
                isDeleting={deletePositionMutation.isPending}
            />
        </div>
    );
}
