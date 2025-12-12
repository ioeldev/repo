import * as React from "react";
import { useState, useCallback } from "react";
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
            console.error("Échec de l'impersonnification:", error);
            alert("Impossible de se connecter en tant que cet utilisateur");
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
            console.error("Échec de la suppression:", error);
            alert("Impossible de supprimer cet utilisateur");
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
            console.error("Échec de la mise à jour du risque:", error);
            alert("Impossible de mettre à jour le niveau de risque");
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
            console.error("Échec de la mise à jour du message:", error);
            alert("Impossible de mettre à jour le message personnalisé");
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
                        aria-label="Tout sélectionner"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Sélectionner la ligne"
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
                            Se connecter en tant que {row.original.first_name} {row.original.last_name}
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
                        Prénom
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
                        Nom
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
                        Email
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
                        Téléphone
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
                        Solde USDT
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
                        Solde EUR
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
                        Solde BTC
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
                        Solde Robot
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
                        Solde Placements
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => ((row.getValue("invest_balance") as number) || 0).toFixed(2),
            },
            {
                id: "actions",
                header: "Actions",
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
                                    Depot
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenCreatePositionDialog(user)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Créer une position
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenTransferDialog(user)}>
                                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                                    Convertir
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenRiskDialog(user)}>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Ajuster le risque
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMessageDialog(user)}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Message personnalisé
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(user)} variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
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
                        {selectedCount} utilisateur{selectedCount > 1 ? "s" : ""} sélectionné
                        {selectedCount > 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRowSelection({})}>
                            Tout déselectionner
                        </Button>
                        <Button size="sm" onClick={() => console.log("Mass transaction", selectedUserIds)}>
                            Transaction en masse
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
                                    Chargement des utilisateurs...
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
                                    Aucun utilisateur
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
                        <DialogTitle>Supprimer l'utilisateur</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer {selectedUser?.first_name} {selectedUser?.last_name} ?
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                            {isSubmitting ? "Suppression..." : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Risk Level Dialog */}
            <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajuster le niveau de risque</DialogTitle>
                        <DialogDescription>
                            Modifier le multiplicateur de risque pour {selectedUser?.first_name}{" "}
                            {selectedUser?.last_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="risk-level" className="text-right">
                                Multiplicateur
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
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmRisk} disabled={isSubmitting}>
                            {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Message Dialog */}
            <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Message personnalisé</DialogTitle>
                        <DialogDescription>
                            Définir un message personnalisé pour {selectedUser?.first_name} {selectedUser?.last_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="custom-message">Message</Label>
                            <textarea
                                id="custom-message"
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Entrez un message personnalisé..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleConfirmMessage} disabled={isSubmitting}>
                            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
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
