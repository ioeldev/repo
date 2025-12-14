import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";
import { toast } from "sonner";

type Symbol = "BTC" | "USDT" | "EUR";

interface ConvertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    btcPrice?: number;
    eurPrice?: number;
}

export function ConvertDialog({
    open,
    onOpenChange,
    user,
    btcPrice = 0,
    eurPrice = 1,
}: ConvertDialogProps) {
    const queryClient = useQueryClient();
    const [source, setSource] = useState<Symbol>("USDT");
    const [destination, setDestination] = useState<Symbol>("BTC");
    const [amount, setAmount] = useState(0);

    const getBalance = (symbol: Symbol): number => {
        if (!user) return 0;
        return user.balances.find((b) => b.symbol === symbol)?.balance || 0;
    };

    const maxBalance = getBalance(source);

    const calculateConversion = (amt: number, from: Symbol, to: Symbol): number => {
        if (from === to) return amt;

        // Convert source to USDT first (common base)
        let usdtAmount = amt;
        if (from === "BTC") usdtAmount = amt * btcPrice;
        else if (from === "EUR") usdtAmount = amt / eurPrice;

        // Convert USDT to destination
        if (to === "USDT") return usdtAmount;
        if (to === "BTC") return usdtAmount / btcPrice;
        if (to === "EUR") return usdtAmount * eurPrice;

        return usdtAmount;
    };

    const estimatedAmount = calculateConversion(amount, source, destination);

    const convertMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("User not found");

            // Calculate new balances
            const newBalances = [...user.balances];

            // Deduct from source
            const sourceIndex = newBalances.findIndex((b) => b.symbol === source);
            if (sourceIndex !== -1) {
                newBalances[sourceIndex] = {
                    ...newBalances[sourceIndex],
                    balance: newBalances[sourceIndex].balance - amount,
                };
            }

            // Add to destination
            const destIndex = newBalances.findIndex((b) => b.symbol === destination);
            if (destIndex !== -1) {
                newBalances[destIndex] = {
                    ...newBalances[destIndex],
                    balance: newBalances[destIndex].balance + estimatedAmount,
                };
            }

            return usersService.updateMe({ balances: newBalances });
        },
        onSuccess: () => {
            toast.success("Conversion successful!");
            setAmount(0);
            onOpenChange(false);
            // Invalidate user query to refresh data
            queryClient.invalidateQueries({ queryKey: ["me"] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message || "Failed to convert"
            );
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || amount <= 0) return;

        if (source === destination) {
            toast.error("Source and destination must be different");
            return;
        }

        if (amount > maxBalance) {
            toast.error(`Insufficient balance. Available: ${maxBalance.toFixed(8)} ${source}`);
            return;
        }

        convertMutation.mutate();
    };

    const handleSourceChange = (value: Symbol) => {
        setSource(value);
        setAmount(0);
    };

    const handleDestinationChange = (value: Symbol) => {
        setDestination(value);
        setAmount(0);
    };

    useEffect(() => {
        if (!open) {
            setAmount(0);
            setSource("USDT");
            setDestination("BTC");
        }
    }, [open]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Convert Between Currencies</DialogTitle>
                    <DialogDescription>
                        Convert your funds between different currencies
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        {/* Source */}
                        <div className="grid gap-2">
                            <Label htmlFor="source">From</Label>
                            <Select value={source} onValueChange={handleSourceChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Available balance: {maxBalance.toFixed(8)} {source}
                            </p>
                        </div>

                        {/* Amount */}
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount to convert</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.00000001"
                                placeholder="0.00"
                                value={amount || ""}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>

                        {/* Slider */}
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Amount (slider)</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAmount(maxBalance)}
                                >
                                    Max
                                </Button>
                            </div>
                            <Slider
                                value={[amount]}
                                onValueChange={(values) => setAmount(values[0])}
                                min={0}
                                max={maxBalance}
                                step={maxBalance / 1000}
                                className="w-full"
                            />
                        </div>

                        {/* Destination */}
                        <div className="grid gap-2">
                            <Label htmlFor="destination">To</Label>
                            <Select value={destination} onValueChange={handleDestinationChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimated amount */}
                        {amount > 0 && source !== destination && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm">
                                    You will receive approximately{" "}
                                    <span className="font-medium">{estimatedAmount.toFixed(8)}</span>{" "}
                                    {destination}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={convertMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={convertMutation.isPending || amount <= 0}
                            className="flex items-center gap-2"
                        >
                            {convertMutation.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Confirm Conversion
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
