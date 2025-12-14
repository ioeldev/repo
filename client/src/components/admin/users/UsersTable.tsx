import * as React from "react";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
} from "@tanstack/react-table";
import {
    ArrowUpDown,
    Tv,
    MoreVertical,
    FileText,
    Plus,
    ArrowLeftRight,
    AlertTriangle,
    MessageSquare,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import type { User, CreatePositionPayload } from "@/services/api";
import { usersService, positionsService } from "@/services/api";
import { DepositDialog } from "./DepositDialog";
import { TransferDialog } from "./TransferDialog";
import { CreatePositionDialog } from "./CreatePositionDialog";
import type { UpdateUserRequest } from "@/services/api/users";

interface UsersTableProps {
    users: User[];
    pairs?: Array<{ pair: string; price: string; name: string }>;
    btcPrice?: number;
    eurPrice?: number;
    isLoading?: boolean;
    onUserDeleted?: () => void;
    onUserUpdated?: () => void;
}

export function UsersTable({
    users,
    pairs = [],
    btcPrice = 0,
    eurPrice = 1,
    isLoading = false,
    onUserDeleted,
    onUserUpdated,
}: UsersTableProps) {
    const { t } = useTranslation();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [riskDialogOpen, setRiskDialogOpen] = useState(false);
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [createPositionDialogOpen, setCreatePositionDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form states
    const [riskLevel, setRiskLevel] = useState<number>(1);
    const [customMessage, setCustomMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get selected user IDs
    const selectedUserIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    const selectedCount = selectedUserIds.length;

    const handleImpersonate = useCallback(async (user: User) => {
        try {
            // Get impersonation tokens from backend
            const response = await usersService.impersonate(user._id);
            const { access_token, refresh_token } = response.data.token;

            // Save current admin tokens in the NEW window's localStorage
            // We'll pass them as URL params and the new window will handle storage
            const currentAccessToken = localStorage.getItem("access_token");
            const currentRefreshToken = localStorage.getItem("refresh_token");

            // Open in new window with both impersonation and admin tokens
            const clientUrl = window.location.origin;
            const impersonationUrl = `${clientUrl}?access_token=${access_token}&refresh_token=${refresh_token}&admin_access_token=${currentAccessToken}&admin_refresh_token=${currentRefreshToken}`;
            console.log("impersonationUrl", impersonationUrl);
            window.location.href = impersonationUrl;
        } catch (error) {
            console.error(t('admin.users.errors.impersonateFailed'), error);
            alert(t('admin.users.errors.impersonateError'));
        }
    }, []);

    const handleOpenDeleteDialog = (user: User) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            await usersService.delete(selectedUser._id);
            setDeleteDialogOpen(false);
            setSelectedUser(null);
            onUserDeleted?.();
        } catch (error) {
            console.error(t('admin.users.errors.deleteFailed'), error);
            alert(t('admin.users.errors.deleteFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenRiskDialog = (user: User) => {
        setSelectedUser(user);
        setRiskLevel(user.risk_level || 1);
        setRiskDialogOpen(true);
    };

    const handleConfirmRisk = async () => {
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            await usersService.updateRiskLevel(selectedUser._id, riskLevel);
            setRiskDialogOpen(false);
            setSelectedUser(null);
            onUserUpdated?.();
        } catch (error) {
            console.error(t('admin.users.errors.riskUpdateFailed'), error);
            alert(t('admin.users.errors.riskUpdateFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenMessageDialog = (user: User) => {
        setSelectedUser(user);
        setCustomMessage(user.custom_message || "");
        setMessageDialogOpen(true);
    };

    const handleConfirmMessage = async () => {
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            await usersService.updateCustomMessage(selectedUser._id, customMessage);
            setMessageDialogOpen(false);
            setSelectedUser(null);
            setCustomMessage("");
            onUserUpdated?.();
        } catch (error) {
            console.error(t('admin.users.errors.messageFailed'), error);
            alert(t('admin.users.errors.messageFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDepositDialog = (user: User) => {
        setSelectedUser(user);
        setDepositDialogOpen(true);
    };

    const handleDeposit = async (userId: string, amount: number, symbol: string) => {
        await usersService.updateBalance(userId, symbol, amount);
        onUserUpdated?.();
    };

    const handleOpenTransferDialog = (user: User) => {
        setSelectedUser(user);
        setTransferDialogOpen(true);
    };

    const handleTransfer = async (userId: string, data: UpdateUserRequest) => {
        await usersService.update(userId, data);
        onUserUpdated?.();
    };

    const handleOpenCreatePositionDialog = (user: User) => {
        setSelectedUser(user);
        setCreatePositionDialogOpen(true);
    };

    const handleCreatePosition = async (userId: string, position: CreatePositionPayload) => {
        await positionsService.adminCreatePosition({ ...position, user_id: userId });
        onUserUpdated?.();
    };

    const columns: ColumnDef<User>[] = React.useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label={t('admin.users.selectAll')}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={t('admin.users.selectRow')}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "impersonate",
                header: "",
                cell: ({ row }) => (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleImpersonate(row.original)}>
                                <Tv className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {t('admin.users.impersonate', { name: `${row.original.first_name} ${row.original.last_name}` })}
                        </TooltipContent>
                    </Tooltip>
                ),
                enableSorting: false,
            },
            {
                accessorKey: "first_name",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="!px-0"
                    >
                        {t('admin.users.firstName')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.getValue("first_name"),
            },
            {
                accessorKey: "last_name",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.lastName')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.getValue("last_name"),
            },
            {
                accessorKey: "email",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.email')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.getValue("email"),
            },
            {
                accessorKey: "phone",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.phone')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => row.getValue("phone"),
            },
            {
                accessorFn: (row) => {
                    const usdtBalance = row.balances.find((b) => b.symbol === "USDT");
                    return usdtBalance ? usdtBalance.balance : 0;
                },
                id: "usdtBalance",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.balanceUsdt')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const usdtBalance = row.original.balances.find((b) => b.symbol === "USDT");
                    return usdtBalance ? usdtBalance.balance.toFixed(2) : "0.00";
                },
            },
            {
                accessorFn: (row) => {
                    const eurBalance = row.balances.find((b) => b.symbol === "EUR");
                    return eurBalance ? eurBalance.balance : 0;
                },
                id: "eurBalance",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.balanceEur')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const eurBalance = row.original.balances.find((b) => b.symbol === "EUR");
                    return eurBalance ? eurBalance.balance.toFixed(2) : "0.00";
                },
            },
            {
                accessorFn: (row) => {
                    const btcBalance = row.balances.find((b) => b.symbol === "BTC");
                    return btcBalance ? btcBalance.balance : 0;
                },
                id: "btcBalance",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.balanceBtc')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const btcBalance = row.original.balances.find((b) => b.symbol === "BTC");
                    return btcBalance ? btcBalance.balance.toFixed(8) : "0.00000000";
                },
            },
            {
                accessorKey: "robots_balance",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.balanceRobot')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => ((row.getValue("robots_balance") as number) || 0).toFixed(2),
            },
            {
                accessorKey: "invest_balance",
                header: ({ column }) => (
                    <Button
                        variant="link"
                        className="!px-0"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.users.balancePlacements')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => ((row.getValue("invest_balance") as number) || 0).toFixed(2),
            },
            {
                id: "actions",
                header: t('admin.users.actions'),
                cell: ({ row }) => {
                    const user = row.original;

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDepositDialog(user)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('admin.users.deposit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenCreatePositionDialog(user)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('admin.users.createPosition')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenTransferDialog(user)}>
                                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                                    {t('admin.users.convert')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenRiskDialog(user)}>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    {t('admin.users.adjustRisk')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMessageDialog(user)}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    {t('admin.users.customMessage')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(user)} variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('admin.users.deleteUser')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
                enableSorting: false,
            },
        ],
        [handleImpersonate]
    );

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection,
        },
    });

    return (
        <div className="space-y-4">
            {selectedCount > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm text-muted-foreground">
                        {t('admin.users.selectedCount', { count: selectedCount })}
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRowSelection({})}>
                            {t('admin.users.deselectAll')}
                        </Button>
                        <Button size="sm" onClick={() => console.log("Mass transaction", selectedUserIds)}>
                            {t('admin.users.bulkTransaction')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border">
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
                                    {t('admin.users.loading')}
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
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('admin.users.noUsers')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.users.deleteDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.users.deleteDialog.description', { name: `${selectedUser?.first_name} ${selectedUser?.last_name}` })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            {t('admin.users.deleteDialog.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                            {isSubmitting ? t('admin.users.deleteDialog.deleting') : t('admin.users.deleteDialog.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Risk Level Dialog */}
            <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.users.riskDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.users.riskDialog.description', { name: `${selectedUser?.first_name} ${selectedUser?.last_name}` })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="risk-level" className="text-right">
                                {t('admin.users.riskDialog.multiplier')}
                            </Label>
                            <Input
                                id="risk-level"
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="10"
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(parseFloat(e.target.value))}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRiskDialogOpen(false)}>
                            {t('admin.users.riskDialog.cancel')}
                        </Button>
                        <Button onClick={handleConfirmRisk} disabled={isSubmitting}>
                            {isSubmitting ? t('admin.users.riskDialog.updating') : t('admin.users.riskDialog.update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Message Dialog */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.users.messageDialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.users.messageDialog.description', { name: `${selectedUser?.first_name} ${selectedUser?.last_name}` })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="custom-message">{t('admin.users.messageDialog.message')}</Label>
                            <textarea
                                id="custom-message"
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={t('admin.users.messageDialog.placeholder')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                            {t('admin.users.messageDialog.cancel')}
                        </Button>
                        <Button onClick={handleConfirmMessage} disabled={isSubmitting}>
                            {isSubmitting ? t('admin.users.messageDialog.saving') : t('admin.users.messageDialog.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deposit Dialog */}
            <DepositDialog
                open={depositDialogOpen}
                onOpenChange={setDepositDialogOpen}
                user={selectedUser}
                onDeposit={handleDeposit}
            />

            {/* Transfer Dialog */}
            <TransferDialog
                open={transferDialogOpen}
                onOpenChange={setTransferDialogOpen}
                user={selectedUser}
                onTransfer={handleTransfer}
                btcPrice={btcPrice}
                eurPrice={eurPrice}
            />

            {/* Create Position Dialog */}
            <CreatePositionDialog
                open={createPositionDialogOpen}
                onOpenChange={setCreatePositionDialogOpen}
                user={selectedUser}
                pairs={pairs}
                onCreatePosition={handleCreatePosition}
            />
        </div>
    );
}
