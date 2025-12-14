import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Check, X, Ban } from "lucide-react";
import type { User, Deposit, Withdraw } from "@/types/auth";
import { formatAmountByCurrency } from "@/utils/formatPrice";
import { useMutation } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";
import { toast } from "sonner";

interface DepositsWithdrawsTableProps {
  data: {
    deposits: Array<Deposit & { user: User }>;
    withdraws: Array<Withdraw & { user: User }>;
  };
  onUpdate: () => void;
}

type Transaction = (Deposit | Withdraw) & {
  type: "deposit" | "withdraw";
  userId: string;
  userName: string;
};

export function DepositsWithdrawsTable({
  data,
  onUpdate,
}: DepositsWithdrawsTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Combine all deposits and withdraws
  const transactions: Transaction[] = [
    ...(data.deposits || []).map((d) => ({
      ...d,
      type: "deposit" as const,
      userId: d.user._id,
      userName: `${d.user.first_name} ${d.user.last_name}`,
    })),
    ...(data.withdraws || []).map((w) => ({
      ...w,
      type: "withdraw" as const,
      userId: w.user._id,
      userName: `${w.user.first_name} ${w.user.last_name}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const approveMutation = useMutation({
    mutationFn: async ({
      userId,
      transactionId,
      type,
    }: {
      userId: string;
      transactionId: string;
      type: "deposit" | "withdraw";
    }) => {
      if (type === "deposit") {
        return usersService.approveDeposit(userId, transactionId);
      } else {
        return usersService.approveWithdraw(userId, transactionId);
      }
    },
    onSuccess: () => {
      toast.success("Transaction approuvée avec succès !");
      onUpdate();
      setLoadingId(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Échec de l'approbation de la transaction",
      );
      setLoadingId(null);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({
      userId,
      transactionId,
      type,
    }: {
      userId: string;
      transactionId: string;
      type: "deposit" | "withdraw";
    }) => {
      if (type === "deposit") {
        return usersService.declineDeposit(userId, transactionId);
      } else {
        return usersService.declineWithdraw(userId, transactionId);
      }
    },
    onSuccess: () => {
      toast.success("Transaction refusée avec succès !");
      onUpdate();
      setLoadingId(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Échec du refus de la transaction",
      );
      setLoadingId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({
      userId,
      transactionId,
      type,
    }: {
      userId: string;
      transactionId: string;
      type: "deposit" | "withdraw";
    }) => {
      if (type === "deposit") {
        return usersService.cancelDeposit(userId, transactionId);
      } else {
        return usersService.cancelWithdraw(userId, transactionId);
      }
    },
    onSuccess: () => {
      toast.success("Transaction annulée avec succès !");
      onUpdate();
      setLoadingId(null);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Échec de l'annulation de la transaction",
      );
      setLoadingId(null);
    },
  });

  const handleApprove = (transaction: Transaction) => {
    setLoadingId(transaction._id);
    approveMutation.mutate({
      userId: transaction.userId,
      transactionId: transaction._id,
      type: transaction.type,
    });
  };

  const handleDecline = (transaction: Transaction) => {
    setLoadingId(transaction._id);
    declineMutation.mutate({
      userId: transaction.userId,
      transactionId: transaction._id,
      type: transaction.type,
    });
  };

  const handleCancel = (transaction: Transaction) => {
    setLoadingId(transaction._id);
    cancelMutation.mutate({
      userId: transaction.userId,
      transactionId: transaction._id,
      type: transaction.type,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          >
            En attente
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
            Approuvé
          </Badge>
        );
      case "declined":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-500 border-red-500/20"
          >
            Refusé
          </Badge>
        );
      case "canceled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-500/10 text-gray-500 border-gray-500/20"
          >
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: "deposit" | "withdraw") => {
    return type === "deposit" ? (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-500 border-blue-500/20"
      >
        Dépôt
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="bg-purple-500/10 text-purple-500 border-purple-500/20"
      >
        Retrait
      </Badge>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune demande de dépôt ou de retrait
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Devise</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction._id}>
              <TableCell className="font-medium">
                {transaction.userName}
              </TableCell>
              <TableCell>{getTypeBadge(transaction.type)}</TableCell>
              <TableCell className="font-medium">
                {formatAmountByCurrency(transaction.amount, transaction.symbol)}
              </TableCell>
              <TableCell>{transaction.symbol}</TableCell>
              <TableCell>
                {format(new Date(transaction.date), "MMM dd, yyyy HH:mm")}
              </TableCell>
              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={loadingId === transaction._id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {transaction.status === "pending" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleApprove(transaction)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approuver
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDecline(transaction)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Refuser
                        </DropdownMenuItem>
                      </>
                    )}
                    {(transaction.status === "pending" ||
                      transaction.status === "approved") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleCancel(transaction)}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Annuler
                        </DropdownMenuItem>
                      </>
                    )}
                    {transaction.status !== "pending" &&
                      transaction.status !== "approved" && (
                        <DropdownMenuItem disabled>
                          Aucune action disponible
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
