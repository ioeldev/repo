import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";
import { toast } from "sonner";

type Symbol = "BTC" | "USDT" | "EUR";

interface DepositDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
}

export function DepositDialog({ open, onOpenChange, user }: DepositDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [symbol, setSymbol] = useState<Symbol>("USDT");
    const [amount, setAmount] = useState("");

    const depositMutation = useMutation({
        mutationFn: async () => {
            const numAmount = parseFloat(amount);
            return usersService.requestDeposit(numAmount, symbol);
        },
        onSuccess: () => {
            toast.success(t("user.dialogs.deposit.success"));
            setAmount("");
            onOpenChange(false);
            // Invalidate user query to refresh data
            queryClient.invalidateQueries({ queryKey: ["me"] });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || t("user.dialogs.deposit.error"));
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);

        if (!user || !amount || isNaN(numAmount) || numAmount <= 0) {
            toast.error(t("user.dialogs.deposit.invalidAmount"));
            return;
        }

        depositMutation.mutate();
    };

    useEffect(() => {
        if (!open) {
            setAmount("");
            setSymbol("USDT");
        }
    }, [open]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("user.dialogs.deposit.title")}</DialogTitle>
                    <DialogDescription>{t("user.dialogs.deposit.description")}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        {/* Currency */}
                        <div className="grid gap-2">
                            <Label htmlFor="symbol">{t("user.dialogs.deposit.currency")}</Label>
                            <Select value={symbol} onValueChange={(value) => setSymbol(value as Symbol)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("user.dialogs.deposit.selectCurrency")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTC">{t("user.dialogs.deposit.btc")}</SelectItem>
                                    <SelectItem value="USDT">{t("user.dialogs.deposit.usdt")}</SelectItem>
                                    <SelectItem value="EUR">{t("user.dialogs.deposit.eur")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount */}
                        <div className="grid gap-2">
                            <Label htmlFor="amount">{t("user.dialogs.deposit.amount")}</Label>
                            <Input
                                id="amount"
                                type="text"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Info message */}
                        <div className="rounded-md bg-muted p-3">
                            <p className="text-sm text-muted-foreground">{t("user.dialogs.deposit.infoMessage")}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={depositMutation.isPending}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={depositMutation.isPending || !amount}
                            className="flex items-center gap-2"
                        >
                            {depositMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("user.dialogs.deposit.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
