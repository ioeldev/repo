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
import type { User } from "@/services/api";
import type { UpdateUserRequest } from "@/services/api/users";

type Symbol = "BTC" | "USDT" | "EUR" | "ROBOT" | "INVEST";

interface TransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    onTransfer: (userId: string, data: UpdateUserRequest) => Promise<void>;
    btcPrice?: number;
    eurPrice?: number;
}

export function TransferDialog({
    open,
    onOpenChange,
    user,
    onTransfer,
    btcPrice = 0,
    eurPrice = 1,
}: TransferDialogProps) {
    const [source, setSource] = useState<Symbol>("USDT");
    const [destination, setDestination] = useState<Symbol>("BTC");
    const [amount, setAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getBalance = (symbol: Symbol): number => {
        if (!user) return 0;
        switch (symbol) {
            case "BTC":
                return user.balances.find((b) => b.symbol === "BTC")?.balance || 0;
            case "USDT":
                return user.balances.find((b) => b.symbol === "USDT")?.balance || 0;
            case "EUR":
                return user.balances.find((b) => b.symbol === "EUR")?.balance || 0;
            case "ROBOT":
                return user.robots_balance || 0;
            case "INVEST":
                return user.invest_balance || 0;
            default:
                return 0;
        }
    };

    const maxBalance = getBalance(source);

    const calculateConversion = (amt: number, from: Symbol, to: Symbol): number => {
        if (from === to) return amt;

        // Convert source to USDT first (common base)
        let usdtAmount = amt;
        if (from === "BTC") usdtAmount = amt * btcPrice;
        else if (from === "EUR") usdtAmount = amt / eurPrice;
        else if (from === "ROBOT") usdtAmount = amt; // ROBOT is in USDT
        else if (from === "INVEST") usdtAmount = amt / eurPrice; // INVEST is in EUR

        // Convert USDT to destination
        if (to === "USDT" || to === "ROBOT") return usdtAmount;
        if (to === "BTC") return usdtAmount / btcPrice;
        if (to === "EUR" || to === "INVEST") return usdtAmount * eurPrice;

        return usdtAmount;
    };

    const estimatedAmount = calculateConversion(amount, source, destination);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || amount <= 0) return;

        if (source === destination) {
            alert("La source et la destination doivent être différentes");
            return;
        }

        if (amount > maxBalance) {
            alert(`Solde insuffisant. Disponible: ${maxBalance.toFixed(8)} ${source}`);
            return;
        }

        setIsSubmitting(true);

        try {
            // Calculate new balances
            const newBalances = [...user.balances];
            let newRobotBalance = user.robots_balance;
            let newInvestBalance = user.invest_balance;

            // Deduct from source
            if (source === "ROBOT") {
                newRobotBalance -= amount;
            } else if (source === "INVEST") {
                newInvestBalance -= amount;
            } else {
                const sourceIndex = newBalances.findIndex((b) => b.symbol === source);
                if (sourceIndex !== -1) {
                    newBalances[sourceIndex] = {
                        ...newBalances[sourceIndex],
                        balance: newBalances[sourceIndex].balance - amount,
                    };
                }
            }

            // Add to destination
            if (destination === "ROBOT") {
                newRobotBalance += estimatedAmount;
            } else if (destination === "INVEST") {
                newInvestBalance += estimatedAmount;
            } else {
                const destIndex = newBalances.findIndex((b) => b.symbol === destination);
                if (destIndex !== -1) {
                    newBalances[destIndex] = {
                        ...newBalances[destIndex],
                        balance: newBalances[destIndex].balance + estimatedAmount,
                    };
                }
            }

            const payload: UpdateUserRequest = {
                balances: newBalances,
                robots_balance: newRobotBalance,
                invest_balance: newInvestBalance,
            };

            await onTransfer(user._id, payload);
            setAmount(0);
            onOpenChange(false);
        } catch (error) {
            console.error("Conversion échouée:", error);
            alert("Impossible d'effectuer la conversion");
        } finally {
            setIsSubmitting(false);
        }
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
                    <DialogTitle>Conversion entre comptes</DialogTitle>
                    <DialogDescription>
                        Convertir des fonds pour {user.first_name} {user.last_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        {/* Source */}
                        <div className="grid gap-2">
                            <Label htmlFor="source">Source</Label>
                            <Select value={source} onValueChange={handleSourceChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner la source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                    <SelectItem value="ROBOT">Robot Balance</SelectItem>
                                    <SelectItem value="INVEST">Invest Balance</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Solde disponible: {maxBalance.toFixed(8)}{" "}
                                {source === "INVEST"
                                    ? "€"
                                    : source === "BTC"
                                    ? " BTC"
                                    : source === "EUR"
                                    ? " EUR"
                                    : " USDT"}
                            </p>
                        </div>

                        {/* Amount */}
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant à transférer</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value as unknown as number)}
                                required
                            />
                        </div>

                        {/* Slider */}
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Montant (slider)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => setAmount(maxBalance)}>
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
                            <Label htmlFor="destination">Destination</Label>
                            <Select value={destination} onValueChange={handleDestinationChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner la destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                    <SelectItem value="ROBOT">Robot Balance</SelectItem>
                                    <SelectItem value="INVEST">Invest Balance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimated amount */}
                        {amount > 0 && source !== destination && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm">
                                    Environ <span className="font-medium">{estimatedAmount.toFixed(8)}</span>{" "}
                                    {destination === "INVEST"
                                        ? "€"
                                        : destination === "BTC"
                                        ? "BTC"
                                        : destination === "EUR"
                                        ? "EUR"
                                        : "USDT"}{" "}
                                    seront transférés
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting || amount <= 0}>
                            {isSubmitting ? "Conversion..." : "Confirmer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
