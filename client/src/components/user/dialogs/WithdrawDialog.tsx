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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import type { User } from "@/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";
import { toast } from "sonner";

type Symbol = "BTC" | "USDT" | "EUR";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  user,
}: WithdrawDialogProps) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState<Symbol>("USDT");
  const [amount, setAmount] = useState("");

  const getBalance = (currency: Symbol): number => {
    if (!user) return 0;
    return user.balances.find((b) => b.symbol === currency)?.balance || 0;
  };

  const maxBalance = getBalance(symbol);

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount);
      return usersService.requestWithdraw(numAmount, symbol);
    },
    onSuccess: () => {
      toast.success(
        "Withdraw request submitted successfully! Awaiting admin approval.",
      );
      setAmount("");
      onOpenChange(false);
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit withdraw request",
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!user || !amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (numAmount > maxBalance) {
      toast.error(
        `Insufficient balance. Available: ${maxBalance.toFixed(8)} ${symbol}`,
      );
      return;
    }

    withdrawMutation.mutate();
  };

  const handleSymbolChange = (value: Symbol) => {
    setSymbol(value);
    setAmount("");
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
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>
            Submit a withdrawal request. An admin will review and process it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            {/* Currency */}
            <div className="grid gap-2">
              <Label htmlFor="symbol">Currency</Label>
              <Select value={symbol} onValueChange={handleSymbolChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Available balance: {maxBalance.toFixed(8)} {symbol}
              </p>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount to withdraw</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                  onClick={() => setAmount(maxBalance.toString())}
                >
                  Max
                </Button>
              </div>
              <Slider
                value={[parseFloat(amount) || 0]}
                onValueChange={(values) => setAmount(values[0].toString())}
                min={0}
                max={maxBalance}
                step={maxBalance / 1000}
                className="w-full"
              />
            </div>

            {/* Info message */}
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Your withdrawal request will be reviewed. The amount will then
                be transferred to your connected bank account.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={withdrawMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={withdrawMutation.isPending || !amount}
              className="flex items-center gap-2"
            >
              {withdrawMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
