import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Deposit, Withdraw } from "@/types/auth";
import { formatAmountByCurrency } from "@/utils/formatPrice";

interface DepositsWithdrawsTableProps {
    deposits: Deposit[];
    withdraws: Withdraw[];
}

type Transaction = (Deposit | Withdraw) & { type: "deposit" | "withdraw" };

export function DepositsWithdrawsTable({ deposits, withdraws }: DepositsWithdrawsTableProps) {
    const { t } = useTranslation();
    // Combine deposits and withdraws into a single array
    const transactions: Transaction[] = [
        ...deposits.map((d) => ({ ...d, type: "deposit" as const })),
        ...withdraws.map((w) => ({ ...w, type: "withdraw" as const })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        {t("user.transaction.pending")}
                    </Badge>
                );
            case "approved":
                return (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        {t("user.transaction.approved")}
                    </Badge>
                );
            case "declined":
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        {t("user.transaction.declined")}
                    </Badge>
                );
            case "canceled":
                return (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                        {t("user.transaction.canceled")}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeBadge = (type: "deposit" | "withdraw") => {
        return type === "deposit" ? (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                {t("user.transaction.deposit")}
            </Badge>
        ) : (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                {t("user.transaction.withdraw")}
            </Badge>
        );
    };

    if (transactions.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">{t("user.transaction.noTransactions")}</div>;
    }

    return (
        <div className="rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("user.transaction.type")}</TableHead>
                        <TableHead>{t("user.transaction.amount")}</TableHead>
                        <TableHead>{t("user.transaction.currency")}</TableHead>
                        <TableHead>{t("user.transaction.date")}</TableHead>
                        <TableHead>{t("user.transaction.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction) => (
                        <TableRow key={transaction._id}>
                            <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                            <TableCell className="font-medium">
                                {formatAmountByCurrency(transaction.amount, transaction.symbol)}
                            </TableCell>
                            <TableCell>{transaction.symbol}</TableCell>
                            <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy HH:mm")}</TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
