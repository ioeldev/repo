import * as React from "react";
import { memo, useState } from "react";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import { useTickerSymbol } from "@/contexts/TickerContext";
import { calculateUnrealizedPnl } from "@/utils/pnl";
import { formatPrice, formatPercentage, formatQuantity } from "@/utils/formatPrice";
import type { Position } from "@/services/api";

interface PositionWithTicker extends Position {
    tickerSymbol?: string;
}

// Memoized component for real-time PnL display
const RealTimePnLCell = memo(({ position }: { position: PositionWithTicker }) => {
    const symbol = position.tickerSymbol || `${position.symbol}${position.base_currency}`;
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
                    pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
            >
                {formatPrice(pnl, { showSign: true })}
            </div>
        );
    }

    // Calculate real-time PnL for open positions
    const currentPrice = ticker?.price || position.entry_price;
    const unrealizedPnl = calculateUnrealizedPnl(position.type, position.entry_price, currentPrice, position.quantity);

    return (
        <div
            className={`text-right font-medium ${
                unrealizedPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
        >
            {formatPrice(unrealizedPnl, { showSign: true })}
            {position.status === "open" && <span className="text-xs ml-1 opacity-70">(Live)</span>}
        </div>
    );
});

// Memoized component for current price display
const CurrentPriceCell = memo(({ position }: { position: PositionWithTicker }) => {
    const symbol = position.tickerSymbol || `${position.symbol}${position.base_currency}`;
    const ticker = useTickerSymbol(symbol);
    const { formatAmount } = useCurrency();

    if (position.status !== "open") {
        return <div className="text-right">-</div>;
    }

    const currentPrice = ticker?.price || position.entry_price;
    const priceChange = ((currentPrice - position.entry_price) / position.entry_price) * 100;

    return (
        <div className="text-right">
            <div>{formatAmount(currentPrice, "USD")}</div>
            <div className={`text-xs ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatPercentage(priceChange)}
            </div>
        </div>
    );
});

interface PositionsTableProps {
    positions: PositionWithTicker[];
    isLoading?: boolean;
    showRealTimePnL?: boolean;
    onClosePosition?: (positionId: string, exitPrice: number) => Promise<void>;
    isClosing?: boolean;
}

export function PositionsTableOptimized({
    positions,
    isLoading = false,
    showRealTimePnL = false,
    onClosePosition,
    isClosing = false,
}: PositionsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<PositionWithTicker | null>(null);
    const { formatAmount } = useCurrency();

    const handleOpenCloseDialog = (position: PositionWithTicker) => {
        setSelectedPosition(position);
        setCloseDialogOpen(true);
    };

    // Component for the close dialog with market price
    const ClosePositionDialog = memo(() => {
        const symbol =
            selectedPosition?.tickerSymbol || `${selectedPosition?.symbol}${selectedPosition?.base_currency}` || "";
        const ticker = useTickerSymbol(symbol);

        if (!selectedPosition) return null;

        const marketPrice = ticker?.price || selectedPosition.entry_price;

        // Calculate estimated P&L with market price using centralized utility
        const estimatedPnl = calculateUnrealizedPnl(
            selectedPosition.type,
            selectedPosition.entry_price,
            marketPrice,
            selectedPosition.quantity
        );

        const handleConfirmClose = async () => {
            if (!onClosePosition) return;
            try {
                await onClosePosition(selectedPosition._id, marketPrice);
                setCloseDialogOpen(false);
                setSelectedPosition(null);
            } catch (error) {
                console.error("Failed to close position:", error);
            }
        };

        return (
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Close Position</DialogTitle>
                    <DialogDescription>Confirm closing this position at the current market price.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Symbol</Label>
                        <div className="col-span-3 font-medium">
                            {selectedPosition.symbol}/{selectedPosition.base_currency}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Type</Label>
                        <div className="col-span-3">
                            <span
                                className={`font-medium ${
                                    selectedPosition.type === "buy" ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {selectedPosition.type.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Quantity</Label>
                        <div className="col-span-3">{formatQuantity(selectedPosition.quantity)}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Entry Price</Label>
                        <div className="col-span-3">{formatAmount(selectedPosition.entry_price, "USD")}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Market Price</Label>
                        <div className="col-span-3 font-medium">
                            {formatAmount(marketPrice, "USD")}
                            {ticker?.price && <span className="text-xs ml-1 text-muted-foreground">(Live)</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Est. P&L</Label>
                        <div className="col-span-3">
                            <span className={`font-medium ${estimatedPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatPrice(estimatedPnl, { showSign: true })} {selectedPosition.base_currency}
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
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmClose} disabled={isClosing} className="bg-red-600 hover:bg-red-700">
                        {isClosing ? "Closing..." : "Close Position"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        );
    });

    const columns: ColumnDef<PositionWithTicker>[] = React.useMemo(
        () => [
            {
                accessorKey: "symbol",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        Symbol
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="font-medium">{row.getValue("symbol")}</div>,
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
                            {type.toUpperCase()}
                        </div>
                    );
                },
            },
            {
                accessorKey: "quantity",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        Quantity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const quantity = row.getValue("quantity") as number;
                    return <div className="text-right">{formatQuantity(quantity)}</div>;
                },
            },
            {
                accessorKey: "entry_price",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        Entry Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const price = row.getValue("entry_price") as number;
                    return <div className="text-right">{formatAmount(price, "USD")}</div>;
                },
            },
            {
                accessorKey: "liquidation_price",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        Liquidation Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const liquidationPrice = row.getValue("liquidation_price") as number | undefined;
                    if (!liquidationPrice) return <div className="text-right">-</div>;
                    return <div className="text-right">{formatAmount(liquidationPrice, "USD")}</div>;
                },
            },
            ...(showRealTimePnL
                ? [
                      {
                          id: "current_price",
                          header: "Current Price",
                          cell: ({ row }: { row: any }) => <CurrentPriceCell position={row.original} />,
                      },
                  ]
                : []),
            {
                accessorKey: "exit_price",
                header: "Exit Price",
                cell: ({ row }) => {
                    const price = row.getValue("exit_price") as number | undefined;
                    return <div className="text-right">{price ? formatAmount(price, "USD") : "-"}</div>;
                },
            },
            {
                accessorKey: "leverage",
                header: "Leverage",
                cell: ({ row }) => {
                    const leverage = row.getValue("leverage") as number;
                    return <div className="text-center">{leverage}x</div>;
                },
            },
            {
                id: "pnl",
                accessorKey: "pnl",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        P&L
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <RealTimePnLCell position={row.original} />,
            },
            {
                accessorKey: "status",
                header: "Status",
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
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>
                    );
                },
            },
            {
                accessorKey: "entry_time",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 p-0"
                    >
                        Entry Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const date = new Date(row.getValue("entry_time") as string);
                    return (
                        <div className="text-sm">
                            {date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
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
                header: "Exit Time",
                cell: ({ row }) => {
                    const date = row.getValue("exit_time") as string | undefined;
                    if (!date) return <div>-</div>;
                    const dateObj = new Date(date);
                    return (
                        <div className="text-sm">
                            {dateObj.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    );
                },
            },
            ...(onClosePosition && showRealTimePnL
                ? [
                      {
                          id: "actions",
                          header: "Actions",
                          cell: ({ row }: { row: any }) => {
                              const position = row.original;
                              if (position.status !== "open") return null;

                              return (
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenCloseDialog(position)}
                                      disabled={isClosing}
                                      className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                                  >
                                      <X className="h-4 w-4 mr-1" />
                                      Close
                                  </Button>
                              );
                          },
                      },
                  ]
                : []),
        ],
        [formatAmount, showRealTimePnL, onClosePosition, isClosing]
    );

    const table = useReactTable({
        data: positions,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div>
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow className="border-0">
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                Loading positions...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-0">
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No positions found
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Close Position Dialog */}
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                {selectedPosition && <ClosePositionDialog />}
            </Dialog>
        </div>
    );
}
