import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AdjustLeverageDialog } from "./AdjustLeverageDialog";
import { PositionToggle } from "./PositionToggle";
import { ValueInput } from "./ValueInput";
import { useTradingForm } from "@/contexts/TradingFormContext";
import { useTradingContext } from "@/contexts/TradingContext";
import { usePositions } from "@/hooks/usePositions";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export function TradeForm() {
    const { t } = useTranslation();
    const {
        state,
        setLeverageDialogOpen,
        setPositionType,
        setOrderValue,
        availableBalance,
        marginRequired,
        liquidationPrice,
        maxOrderValue,
        positionSize,
        currentPrice,
        createPositionPayload,
    } = useTradingForm();

    const { selectedPair } = useTradingContext();
    const { positions: openPositions } = usePositions(1, 100, "open");
    const { createPosition, isCreating, createError } = usePositions();
    const [reverseConfirmed, setReverseConfirmed] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check if there's an existing open position for the selected pair
    const existingPosition = useMemo(() => {
        if (!selectedPair || !openPositions || openPositions.length === 0) {
            return null;
        }

        // Reconstruct the full symbol from position (symbol + base_currency)
        // e.g., symbol="BTC" + base_currency="USDT" = "BTCUSDT"
        return openPositions.find((position) => {
            const positionSymbol = (position.symbol || position.manual_symbol || "").toUpperCase();
            const positionBaseCurrency = (position.base_currency || "").toUpperCase();
            const positionFullSymbol = `${positionSymbol}${positionBaseCurrency}`;
            const selectedFullSymbol = selectedPair.pair.toUpperCase();

            return positionFullSymbol === selectedFullSymbol && position.status === "open";
        });
    }, [selectedPair, openPositions]);

    // Check if leverage matches existing position
    const leverageMismatch = useMemo(() => {
        if (!existingPosition) {
            return false;
        }
        return existingPosition.leverage !== state.leverage;
    }, [existingPosition, state.leverage]);

    const handlePlaceOrder = () => {
        if (!createPositionPayload) {
            return;
        }

        const payload = { ...createPositionPayload, confirmReversal: reverseConfirmed };

        createPosition(payload, {
            onSuccess: () => {
                setSuccessMessage(
                    t("user.trading.positionCreated", {
                        type: state.positionType === "long" ? t("user.trading.long") : t("user.trading.short"),
                    })
                );
                setReverseConfirmed(false);
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(null), 3000);
            },
        });
    };

    const isDisabled =
        !createPositionPayload ||
        state.orderValue <= 0 ||
        marginRequired > availableBalance ||
        isCreating ||
        leverageMismatch;

    return (
        <div className="flex-1 lg:h-full overflow-y-auto bg-card">
            <div className="p-3 lg:p-3 space-y-3 lg:space-y-3 lg:gap-3 flex flex-col lg:h-full">
                {/* Margin & Leverage - Responsive layout */}
                <div className="space-y-2 lg:space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" disabled size="sm">
                            {t("user.trading.isolatedMargin")}
                        </Button>
                        <Button onClick={() => setLeverageDialogOpen(true)} size="sm">
                            {state.leverage}x
                        </Button>
                        <AdjustLeverageDialog open={state.leverageDialogOpen} setOpen={setLeverageDialogOpen} />
                    </div>
                </div>

                {/* Long/Short Toggle - Responsive */}
                <PositionToggle value={state.positionType} onChange={setPositionType} />

                {/* Order Type Tabs - Responsive */}
                {/* <div className="space-y-2 lg:space-y-2">
                    <div className="flex gap-1 border-b border-border lg:border-muted pb-1">
                        <button className="px-2 lg:px-3 py-1 lg:py-2 text-[10px] lg:text-xs font-bold lg:font-medium border-b-2 border-primary text-primary">
                            Market
                        </button>
                        <button className="px-2 lg:px-3 py-1 lg:py-2 text-[10px] lg:text-xs font-bold lg:font-medium text-muted-foreground hover:text-foreground transition">
                            Limit
                        </button>
                    </div>
                </div> */}

                {/* Price Input - Responsive */}
                {/* <div className="space-y-1 lg:space-y-1">
                    <label className="block text-[9px] lg:text-xs font-bold lg:font-medium text-muted-foreground uppercase lg:uppercase mb-1.5 lg:mb-1">
                        Price (USD)
                    </label>
                    <input
                        type="text"
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-md bg-muted/50 lg:bg-muted border border-border lg:border-muted-foreground/20 text-xs lg:text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 lg:focus:ring-primary focus:border-primary transition"
                        defaultValue="160.23"
                    />
                </div> */}

                {/* Value Input with Slider */}
                <div className="space-y-1">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setOrderValue(maxOrderValue)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                            {t("user.trading.available")} ${availableBalance.toFixed(2)}
                            {currentPrice > 0 && ` (${(availableBalance / currentPrice).toFixed(6)})`}
                        </button>
                    </div>
                    <ValueInput value={state.orderValue} onChange={setOrderValue} min={0} max={maxOrderValue} />
                </div>

                {/* Order Details */}
                <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("user.trading.orderValue")}</span>
                        <span className="font-medium">${state.orderValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("user.trading.marginRequired")}</span>
                        <span className="font-medium">${marginRequired.toFixed(2)}</span>
                    </div>
                    {currentPrice > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                {t("user.trading.positionSize")} ({state.leverage}x)
                            </span>
                            <span className="font-medium">{positionSize.toFixed(6)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("user.trading.liquidationPrice")}</span>
                        <span className="font-medium">
                            {liquidationPrice ? `$${liquidationPrice.toFixed(2)}` : "None"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees</span>
                        <span className="font-medium">0.035% / -0.002%</span>
                    </div>
                </div>

                {/* Leverage Mismatch Warning */}
                {leverageMismatch && existingPosition && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/50">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-yellow-500 text-xs">
                            {t("user.trading.leverageMismatch", {
                                pair: selectedPair?.pair,
                                leverage: existingPosition.leverage,
                            })}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Error/Success Messages */}
                {createError && (
                    <Alert className="bg-red-500/10 border-red-500/50">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-500 text-xs">
                            {createError instanceof Error ? createError.message : t("user.trading.failedToCreate")}
                        </AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert className="bg-green-500/10 border-green-500/50">
                        <AlertCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-500 text-xs">{successMessage}</AlertDescription>
                    </Alert>
                )}

                {/* Reversal Confirmation */}
                {reverseConfirmed && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/50">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-yellow-500 text-xs">
                            {t("user.trading.reversalConfirmed")}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Place Order Button - Responsive */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={isDisabled}
                    className="w-full px-3 lg:px-4 py-2.5 lg:py-3 rounded-md bg-green-500 text-white text-xs lg:text-sm font-extrabold lg:font-semibold hover:bg-green-600 active:bg-green-700 lg:active:bg-green-700 transition shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500 flex items-center justify-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("user.trading.creating")}
                        </>
                    ) : (
                        `${state.positionType === "long" ? "BUY / LONG" : "SELL / SHORT"}`
                    )}
                </button>

                {/* Account Info */}
                <div className="flex flex-col gap-2 border-t border-muted pt-3 text-xs mt-auto">
                    <p className="font-semibold text-muted-foreground uppercase">Account</p>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-medium">${availableBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Order Value</span>
                        <span className="font-medium">${maxOrderValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Leverage</span>
                        <span className="font-medium">{state.leverage}x</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
