import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { User } from "@/services/api";

interface DepositDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    onDeposit: (userId: string, amount: number, symbol: string) => Promise<void>;
}

export function DepositDialog({ open, onOpenChange, user, onDeposit }: DepositDialogProps) {
    const [amount, setAmount] = useState("");
    const [symbol, setSymbol] = useState("USDT");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !amount) return;

        setIsSubmitting(true);
        try {
            await onDeposit(user._id, parseFloat(amount), symbol);
            setAmount("");
            setSymbol("USDT");
            onOpenChange(false);
        } catch (error) {
            console.error("Dépôt échoué:", error);
            alert("Impossible d'effectuer le dépôt");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Dépôt</DialogTitle>
                    <DialogDescription>
                        Effectuer un dépôt pour {user.first_name} {user.last_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current Balances */}
                    <div className="rounded-md border p-4 space-y-2">
                        <p className="text-sm font-medium">Soldes actuels</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {user.balances.map((balance) => (
                                <div key={balance.symbol} className="flex justify-between">
                                    <span className="text-muted-foreground">{balance.symbol}:</span>
                                    <span className="font-medium">{balance.balance.toFixed(8)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Robot:</span>
                                <span className="font-medium">{user.robots_balance?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Invest:</span>
                                <span className="font-medium">{user.invest_balance?.toFixed(2) || "0.00"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Montant</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.00000001"
                                    min="0"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="symbol">Symbole</Label>
                                <Select value={symbol} onValueChange={setSymbol}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le symbole" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BTC">BTC</SelectItem>
                                        <SelectItem value="USDT">USDT</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="ROBOT">ROBOT</SelectItem>
                                        <SelectItem value="INVEST">INVEST</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Dépôt..." : "Déposer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
