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

export function DepositDialog({
  open,
  onOpenChange,
  user,
}: DepositDialogProps) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState<Symbol>("USDT");
  const [amount, setAmount] = useState("");

  const depositMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount);
      return usersService.requestDeposit(numAmount, symbol);
    },
    onSuccess: () => {
      toast.success(
        "Deposit request submitted successfully! Awaiting admin approval.",
      );
      setAmount("");
      onOpenChange(false);
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit deposit request",
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
          <DialogTitle>Request Deposit</DialogTitle>
          <DialogDescription>
            Submit a deposit request. An admin will approve it and credit your
            account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            {/* Currency */}
            <div className="grid gap-2">
              <Label htmlFor="symbol">Currency</Label>
              <Select
                value={symbol}
                onValueChange={(value) => setSymbol(value as Symbol)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount to deposit</Label>
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
              <p className="text-sm text-muted-foreground">
                Your deposit request will be reviewed. Once approved, the funds
                will be added to your account.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={depositMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={depositMutation.isPending || !amount}
              className="flex items-center gap-2"
            >
              {depositMutation.isPending && (
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
