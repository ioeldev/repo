import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrency } from "@/hooks/useCurrency";
import type { Position } from "@/services/api";

interface PositionsTableProps {
  positions: Position[];
  isLoading?: boolean;
}

export function PositionsTable({
  positions,
  isLoading = false,
}: PositionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { formatAmount } = useCurrency();

  const columns: ColumnDef<Position>[] = [
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
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("symbol")}</div>
      ),
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
        return <div className="text-right">{quantity.toFixed(8)}</div>;
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
      accessorKey: "exit_price",
      header: "Exit Price",
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
      accessorKey: "leverage",
      header: "Leverage",
      cell: ({ row }) => {
        const leverage = row.getValue("leverage") as number;
        return <div className="text-center">{leverage}x</div>;
      },
    },
    {
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
      cell: ({ row }) => {
        const pnl = row.getValue("pnl") as number | null | undefined;
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
            {pnl >= 0 ? "+" : ""}
            {pnl.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        );
      },
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
  ];

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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading positions...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
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
    </div>
  );
}
