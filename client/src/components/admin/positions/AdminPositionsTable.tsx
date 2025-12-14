import * as React from "react";
import { memo, useState, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { ArrowUpDown, Edit, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/hooks/useCurrency";
import { useTickerSymbol } from "@/contexts/TickerContext";
import { calculateUnrealizedPnl } from "@/utils/pnl";
import { formatPrice, formatQuantity } from "@/utils/formatPrice";
import type { AdminPosition } from "@/services/api";

// Memoized component for real-time PnL display
const RealTimePnLCell = memo(
  ({
    position,
    pairsPrice,
  }: {
    position: AdminPosition;
    pairsPrice?: number;
  }) => {
    const symbol = `${position.symbol}${position.base_currency}`;
    const ticker = useTickerSymbol(symbol);

    // Only calculate for open positions
    if (position.status !== "open") {
      const pnl = position.pnl;
      if (pnl === null || pnl === undefined) {
        return <div className="text-right">-</div>;
      }
      return (
        <div
          className={`text-right font-medium ${
            pnl >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {formatPrice(pnl, { showSign: true })}
        </div>
      );
    }

    // Calculate real-time PnL for open positions
    // Priority: websocket ticker > pairs data > entry price
    const currentPrice = ticker?.price || pairsPrice || position.entry_price;
    const unrealizedPnl = calculateUnrealizedPnl(
      position.type,
      position.entry_price,
      currentPrice,
      position.quantity,
    );
    const hasLivePrice = !!ticker?.price;

    return (
      <div
        className={`text-right font-medium ${
          unrealizedPnl >= 0
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {formatPrice(unrealizedPnl, { showSign: true })}
        {hasLivePrice && (
          <span className="text-xs ml-1 opacity-70">(Live)</span>
        )}
      </div>
    );
  },
);

RealTimePnLCell.displayName = "RealTimePnLCell";

// Memoized component for current price display
const CurrentPriceCell = memo(
  ({
    position,
    pairsPrice,
  }: {
    position: AdminPosition;
    pairsPrice?: number;
  }) => {
    const symbol = `${position.symbol}${position.base_currency}`;
    const ticker = useTickerSymbol(symbol);
    const { formatAmount } = useCurrency();

    if (position.status !== "open") {
      return <div className="text-right">-</div>;
    }

    // Priority: websocket ticker > pairs data > entry price
    const currentPrice = ticker?.price || pairsPrice || position.entry_price;
    const hasLivePrice = !!ticker?.price;

    return (
      <div className="text-right">
        <div>
          {formatAmount(currentPrice, "USD")}
          {hasLivePrice && (
            <span className="text-xs ml-1 opacity-70">(Live)</span>
          )}
        </div>
      </div>
    );
  },
);

CurrentPriceCell.displayName = "CurrentPriceCell";

interface PairInfo {
  pair: string;
  price: string;
  name: string;
}

interface AdminPositionsTableProps {
  positions: AdminPosition[];
  pairs?: PairInfo[];
  isLoading?: boolean;
  pagination?: PaginationState;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  globalFilter?: string;
  totalRows?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  onGlobalFilterChange?: (filter: string) => void;
  onClosePosition?: (positionId: string, exitPrice: number) => Promise<void>;
  onDeletePosition?: (positionId: string) => Promise<void>;
  onEditPosition?: (position: AdminPosition) => void;
  isClosing?: boolean;
  isDeleting?: boolean;
}

export function AdminPositionsTable({
  positions,
  pairs = [],
  isLoading = false,
  pagination,
  sorting,
  columnFilters,
  globalFilter,
  totalRows = 0,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  onGlobalFilterChange,
  onClosePosition,
  onDeletePosition,
  onEditPosition,
  isClosing = false,
  isDeleting = false,
}: AdminPositionsTableProps) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] =
    useState<AdminPosition | null>(null);
  const { formatAmount } = useCurrency();

  // Helper to get pair price from pairs data
  const getPairPrice = useCallback(
    (symbol: string, baseCurrency: string): number | undefined => {
      const pairSymbol = `${symbol}${baseCurrency}`;
      const pair = pairs.find((p) => p.pair === pairSymbol);
      return pair ? parseFloat(pair.price) : undefined;
    },
    [pairs],
  );

  const handleOpenCloseDialog = (position: AdminPosition) => {
    setSelectedPosition(position);
    setCloseDialogOpen(true);
  };

  const handleOpenDeleteDialog = (position: AdminPosition) => {
    setSelectedPosition(position);
    setDeleteDialogOpen(true);
  };

  // Close Position Dialog
  const ClosePositionDialog = memo(() => {
    const symbol = selectedPosition
      ? `${selectedPosition.symbol}${selectedPosition.base_currency}`
      : "";
    const ticker = useTickerSymbol(symbol);

    if (!selectedPosition) return null;

    const marketPrice = ticker?.price || selectedPosition.entry_price;
    const estimatedPnl = calculateUnrealizedPnl(
      selectedPosition.type,
      selectedPosition.entry_price,
      marketPrice,
      selectedPosition.quantity,
    );

    const handleConfirmClose = async () => {
      if (!onClosePosition) return;
      try {
        await onClosePosition(selectedPosition._id, marketPrice);
        setCloseDialogOpen(false);
        setSelectedPosition(null);
      } catch (error) {
        console.error("Échec de la clôture de la position:", error);
      }
    };

    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Clôturer la position</DialogTitle>
          <DialogDescription>
            Confirmez la clôture de cette position au prix du marché actuel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Utilisateur</Label>
            <div className="col-span-3 font-medium">
              {selectedPosition.user.first_name}{" "}
              {selectedPosition.user.last_name}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Symbole</Label>
            <div className="col-span-3 font-medium">
              {selectedPosition.symbol}/{selectedPosition.base_currency}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <div className="col-span-3">
              <span
                className={`font-medium ${
                  selectedPosition.type === "buy"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {selectedPosition.type === "buy" ? "Achat" : "Vente"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Quantité</Label>
            <div className="col-span-3">
              {formatQuantity(selectedPosition.quantity)}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Prix d'entrée</Label>
            <div className="col-span-3">
              {formatAmount(selectedPosition.entry_price, "USD")}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Prix du marché</Label>
            <div className="col-span-3 font-medium">
              {formatAmount(marketPrice, "USD")}
              {ticker?.price && (
                <span className="text-xs ml-1 text-muted-foreground">
                  (Live)
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">PNL estimé</Label>
            <div className="col-span-3">
              <span
                className={`font-medium ${estimatedPnl >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatPrice(estimatedPnl, { showSign: true })}{" "}
                {selectedPosition.base_currency}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCloseDialogOpen(false);
              setSelectedPosition(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirmClose}
            disabled={isClosing}
            className="bg-red-600 hover:bg-red-700"
          >
            {isClosing ? "Clôture..." : "Clôturer la position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  });

  ClosePositionDialog.displayName = "ClosePositionDialog";

  // Delete Position Dialog
  const DeletePositionDialog = () => {
    if (!selectedPosition) return null;

    const handleConfirmDelete = async () => {
      if (!onDeletePosition) return;
      try {
        await onDeletePosition(selectedPosition._id);
        setDeleteDialogOpen(false);
        setSelectedPosition(null);
      } catch (error) {
        console.error("Échec de la suppression de la position:", error);
      }
    };

    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Supprimer la position</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer cette position ? Cette action est
            irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Utilisateur</Label>
            <div className="col-span-3 font-medium">
              {selectedPosition.user.first_name}{" "}
              {selectedPosition.user.last_name}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Symbole</Label>
            <div className="col-span-3 font-medium">
              {selectedPosition.symbol}/{selectedPosition.base_currency}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedPosition(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  };

  const columns: ColumnDef<AdminPosition>[] = React.useMemo(
    () => [
      {
        accessorFn: (row) => `${row.user.first_name} ${row.user.last_name}`,
        id: "user_name",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0!"
          >
            Nom
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.getValue("user_name"),
      },
      {
        accessorKey: "user.email",
        header: "Email",
        cell: ({ row }) => row.original.user.email,
      },
      {
        accessorKey: "user.phone",
        header: "Téléphone",
        cell: ({ row }) => row.original.user.phone,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as "buy" | "sell";
          return (
            <div
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                type === "buy"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {type === "buy" ? "Achat" : "Vente"}
            </div>
          );
        },
      },
      {
        accessorKey: "symbol",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            Symbole
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("symbol")}</div>
        ),
      },
      {
        accessorKey: "base_currency",
        header: "Monnaie de base",
        cell: ({ row }) => row.getValue("base_currency"),
      },
      {
        id: "current_price",
        header: "Prix actuel",
        cell: ({ row }) => {
          const pairsPrice = getPairPrice(
            row.original.symbol,
            row.original.base_currency,
          );
          return (
            <CurrentPriceCell position={row.original} pairsPrice={pairsPrice} />
          );
        },
      },
      {
        accessorKey: "entry_price",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            Prix d'entrée
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const price = row.getValue("entry_price") as number;
          return <div className="text-right">{formatAmount(price, "USD")}</div>;
        },
      },
      {
        accessorKey: "exit_price",
        header: "Prix de sortie",
        cell: ({ row }) => {
          const price = row.getValue("exit_price") as number | undefined;
          return (
            <div className="text-right">
              {price ? formatAmount(price, "USD") : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "stop_loss",
        header: "Stop Loss",
        cell: ({ row }) => {
          const price = row.getValue("stop_loss") as number | undefined;
          return (
            <div className="text-right">
              {price ? formatAmount(price, "USD") : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "take_profit",
        header: "Take Profit",
        cell: ({ row }) => {
          const price = row.getValue("take_profit") as number | undefined;
          return (
            <div className="text-right">
              {price ? formatAmount(price, "USD") : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            Quantité
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const quantity = row.getValue("quantity") as number;
          return <div className="text-right">{formatQuantity(quantity)}</div>;
        },
      },
      {
        accessorKey: "leverage",
        header: "Levier",
        cell: ({ row }) => {
          const leverage = row.getValue("leverage") as number;
          return <div className="text-center">{leverage}x</div>;
        },
      },
      {
        accessorKey: "base_currency_amount",
        header: "Montant",
        cell: ({ row }) => {
          const amount = row.getValue("base_currency_amount") as number;
          return <div className="text-right">{amount.toFixed(2)}</div>;
        },
      },
      {
        accessorKey: "entry_time",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            Date d'entrée
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue("entry_time") as string);
          return (
            <div className="text-sm">
              {date.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          );
        },
      },
      {
        accessorKey: "exit_time",
        header: "Date de sortie",
        cell: ({ row }) => {
          const date = row.getValue("exit_time") as string | undefined;
          if (!date) return <div>-</div>;
          const dateObj = new Date(date);
          return (
            <div className="text-sm">
              {dateObj.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          );
        },
      },
      {
        id: "pnl",
        accessorKey: "pnl",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            PNL
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const pairsPrice = getPairPrice(
            row.original.symbol,
            row.original.base_currency,
          );
          return (
            <RealTimePnLCell position={row.original} pairsPrice={pairsPrice} />
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="!px-0"
          >
            Statut
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as "open" | "closed";
          return (
            <div
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                status === "open"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
              }`}
            >
              {status === "open" ? "Ouverte" : "Clôturée"}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const position = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditPosition && (
                  <DropdownMenuItem onClick={() => onEditPosition(position)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {position.status === "open" && onClosePosition && (
                  <DropdownMenuItem
                    onClick={() => handleOpenCloseDialog(position)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clôturer
                  </DropdownMenuItem>
                )}
                {onDeletePosition && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleOpenDeleteDialog(position)}
                      variant="destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      formatAmount,
      onClosePosition,
      onDeletePosition,
      onEditPosition,
      getPairPrice,
    ],
  );

  const table = useReactTable({
    data: positions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalRows
      ? Math.ceil(totalRows / (pagination?.pageSize || 10))
      : -1,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: onSortingChange,
    onColumnFiltersChange: onColumnFiltersChange,
    onGlobalFilterChange: onGlobalFilterChange,
    onPaginationChange: onPaginationChange,
  });

  return (
    <div className="space-y-4">
      {onGlobalFilterChange && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Rechercher..."
            value={globalFilter ?? ""}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-0">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Chargement des positions...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Aucune position
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && onPaginationChange && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Affichage de {pagination.pageIndex * pagination.pageSize + 1} à{" "}
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              totalRows,
            )}{" "}
            sur {totalRows} positions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPaginationChange({ ...pagination, pageIndex: 0 })
              }
              disabled={pagination.pageIndex === 0}
            >
              Premier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPaginationChange({
                  ...pagination,
                  pageIndex: pagination.pageIndex - 1,
                })
              }
              disabled={pagination.pageIndex === 0}
            >
              Précédent
            </Button>
            <div className="text-sm">
              Page {pagination.pageIndex + 1} sur{" "}
              {Math.ceil(totalRows / pagination.pageSize) || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPaginationChange({
                  ...pagination,
                  pageIndex: pagination.pageIndex + 1,
                })
              }
              disabled={
                pagination.pageIndex >=
                Math.ceil(totalRows / pagination.pageSize) - 1
              }
            >
              Suivant
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPaginationChange({
                  ...pagination,
                  pageIndex: Math.ceil(totalRows / pagination.pageSize) - 1,
                })
              }
              disabled={
                pagination.pageIndex >=
                Math.ceil(totalRows / pagination.pageSize) - 1
              }
            >
              Dernier
            </Button>
          </div>
        </div>
      )}

      {/* Close Position Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        {selectedPosition && <ClosePositionDialog />}
      </Dialog>

      {/* Delete Position Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {selectedPosition && <DeletePositionDialog />}
      </Dialog>
    </div>
  );
}
