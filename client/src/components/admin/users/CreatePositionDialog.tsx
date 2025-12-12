import { useState, useEffect, useMemo, memo } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Search } from "lucide-react";
import { useTickerSymbol } from "@/contexts/TickerContext";
import { useAdminPositions } from "@/hooks/admin/useAdminPositions";
import {
    cleanQuantityInput,
    cleanAmountInput,
    roundToDecimals,
    getAmountDecimals,
    getAmountStep,
    formatAmountByCurrency,
    formatAmountForInput,
    MAX_QUANTITY_DECIMALS,
} from "@/utils/formatPrice";
import type { User, CreatePositionPayload } from "@/services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CreatePositionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    pairs?: Array<{ pair: string; price: string; name: string }>;
    onCreatePosition: (userId: string, position: CreatePositionPayload) => Promise<void>;
}

// Memoized component for individual pair items with real-time prices
const PairItem = memo(
    ({ pair, isSelected }: { pair: { pair: string; price: string; name: string }; isSelected: boolean }) => {
        const ticker = useTickerSymbol(pair.pair);
        const displayPrice = ticker?.price || parseFloat(pair.price);

        return (
            <>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground text-sm">{pair.name || pair.pair}</span>
                    <span className="text-xs text-muted-foreground">{displayPrice.toFixed(8)}</span>
                </div>
                {isSelected && <span className="text-primary">✓</span>}
            </>
        );
    }
);

export function CreatePositionDialog({
    open,
    onOpenChange,
    user,
    pairs = [],
    onCreatePosition,
}: CreatePositionDialogProps) {
    const [selectedPair, setSelectedPair] = useState("");
    const [manualSymbol, setManualSymbol] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [type, setType] = useState<"buy" | "sell">("buy");
    const [baseCurrency, setBaseCurrency] = useState("USDT");
    const [entryPrice, setEntryPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [amount, setAmount] = useState("");
    const [leverage, setLeverage] = useState(1);
    const [takeProfit, setTakeProfit] = useState("");
    const [stopLoss, setStopLoss] = useState("");
    const [isClosedPosition, setIsClosedPosition] = useState(false);
    const [exitPrice, setExitPrice] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get open positions for the selected user
    const { positions: openPositions } = useAdminPositions({
        skip: 0,
        limit: 100,
        filters: {
            ...(user?._id ? { user_id: user._id } : {}),
            status: "open",
        },
    });

    // Check if there's an existing open position for the selected pair
    const existingPosition = useMemo(() => {
        if ((!selectedPair && !manualSymbol) || !openPositions || openPositions.length === 0) {
            return null;
        }

        // Determine the full symbol we're trying to create
        const targetFullSymbol = selectedPair
            ? selectedPair.toUpperCase()
            : manualSymbol
            ? `${manualSymbol.toUpperCase()}${baseCurrency.toUpperCase()}`
            : null;

        if (!targetFullSymbol) {
            return null;
        }

        // Reconstruct the full symbol from position (symbol + base_currency)
        // e.g., symbol="BTC" + base_currency="USDT" = "BTCUSDT"
        return openPositions.find((position) => {
            const positionSymbol = (position.symbol || position.manual_symbol || "").toUpperCase();
            const positionBaseCurrency = (position.base_currency || "").toUpperCase();
            const positionFullSymbol = `${positionSymbol}${positionBaseCurrency}`;

            return positionFullSymbol === targetFullSymbol && position.status === "open";
        });
    }, [selectedPair, manualSymbol, baseCurrency, openPositions]);

    // Check if leverage matches existing position
    const leverageMismatch = useMemo(() => {
        if (!existingPosition) {
            return false;
        }
        return existingPosition.leverage !== leverage;
    }, [existingPosition, leverage]);

    // Filter pairs based on base currency and search query
    const filteredPairs = useMemo(() => {
        const basePairs = pairs.filter((p) => p.pair.endsWith(baseCurrency));
        if (!searchQuery) return basePairs;
        const search = searchQuery.toLowerCase();
        return basePairs.filter(
            (pair) => pair.name.toLowerCase().includes(search) || pair.pair.toLowerCase().includes(search)
        );
    }, [pairs, baseCurrency, searchQuery]);

    // Parse selected pair to get symbol and current price
    const selectedPairData = pairs.find((p) => p.pair === selectedPair);
    const symbol = selectedPair ? selectedPair.replace(baseCurrency, "") : manualSymbol;

    // Get real-time ticker data for selected pair
    const ticker = useTickerSymbol(selectedPair);
    const marketPrice = ticker?.price || (selectedPairData ? parseFloat(selectedPairData.price) : 0);

    // Use manual entry price or market price
    const currentPrice = entryPrice ? parseFloat(entryPrice) : marketPrice;

    // Get user balance for selected currency
    const userBalance = user?.balances.find((b) => b.symbol === baseCurrency)?.balance || 0;

    // Calculate quantities and amounts
    const amountNum = parseFloat(amount) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const positionSize = amountNum * leverage;

    // Calculate liquidation price
    const liquidationPrice = type === "buy" ? currentPrice * (1 - 1 / leverage) : currentPrice * (1 + 1 / leverage);

    // Calculate PNL for closed positions
    const calculatePNL = () => {
        if (!isClosedPosition || !exitPrice) return 0;
        const exitPriceNum = parseFloat(exitPrice);
        let pnl = (exitPriceNum - currentPrice) * quantityNum * leverage;
        if (type === "sell") pnl = -pnl;
        return pnl;
    };

    // Calculate potential PnL for take profit / stop loss
    const calculatePotentialPnl = (targetPrice: number | undefined) => {
        if (!targetPrice || !currentPrice || !amountNum) return null;
        const priceChange = (targetPrice - currentPrice) / currentPrice;
        let result = priceChange * (amountNum * leverage);
        if (type === "sell") result = -result;
        return formatAmountByCurrency(result, baseCurrency);
    };

    // Auto-calculate amount when quantity changes
    useEffect(() => {
        if (quantity && currentPrice > 0) {
            const calculatedAmount = parseFloat(quantity) * currentPrice;
            if (!isNaN(calculatedAmount)) {
                // Format with exact decimals for the currency
                setAmount(formatAmountForInput(calculatedAmount, baseCurrency));
            }
        }
    }, [quantity, currentPrice, baseCurrency]);

    // Auto-calculate quantity when amount changes (limit to MAX_QUANTITY_DECIMALS)
    useEffect(() => {
        if (amount && currentPrice > 0) {
            const calculatedQuantity = parseFloat(amount) / currentPrice;
            if (!isNaN(calculatedQuantity)) {
                // Round to max decimals to avoid floating point issues
                const roundedQuantity = roundToDecimals(calculatedQuantity, MAX_QUANTITY_DECIMALS);
                setQuantity(roundedQuantity.toString());
            }
        }
    }, [amount, currentPrice]);

    // Set current price from market
    const handleSetCurrentPrice = () => {
        if (marketPrice > 0) {
            setEntryPrice(marketPrice.toString());
        } else {
            alert("Impossible de trouver le prix actuel de la paire");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!user) return;

        if (!selectedPair && !manualSymbol) {
            alert("Veuillez choisir ou entrer une paire");
            return;
        }

        if (selectedPair && manualSymbol) {
            alert("Veuillez choisir une seule option: soit une paire de la liste, soit une paire manuelle");
            return;
        }

        if (!amount || amountNum <= 0) {
            alert("Le montant doit être supérieur à 0");
            return;
        }

        if (!quantity || quantityNum <= 0) {
            alert("La quantité doit être supérieure à 0");
            return;
        }

        if (!currentPrice || currentPrice <= 0) {
            alert("Le prix d'entrée doit être supérieur à 0");
            return;
        }

        if (!isClosedPosition && amountNum > userBalance) {
            alert(
                `Solde insuffisant. Disponible: ${formatAmountByCurrency(userBalance, baseCurrency)} ${baseCurrency}`
            );
            return;
        }

        if (isClosedPosition && (!exitPrice || parseFloat(exitPrice) <= 0)) {
            alert("Le prix de sortie doit être supérieur à 0");
            return;
        }

        setIsSubmitting(true);
        try {
            // Ensure quantity is rounded to max decimals before submission
            const finalQuantity = roundToDecimals(quantityNum, MAX_QUANTITY_DECIMALS);
            // Ensure amount is rounded to appropriate decimals for the currency
            const finalAmount = roundToDecimals(amountNum, getAmountDecimals(baseCurrency));
            const finalPositionSize = roundToDecimals(finalAmount * leverage, getAmountDecimals(baseCurrency));

            const positionPayload: CreatePositionPayload = {
                symbol: selectedPair ? symbol : "",
                manual_symbol: manualSymbol || selectedPair,
                quantity: finalQuantity,
                entry_price: currentPrice,
                entry_time: new Date().toISOString(),
                base_currency: baseCurrency,
                base_currency_amount: finalAmount,
                type,
                leverage,
                position_size: finalPositionSize,
                status: isClosedPosition ? "closed" : "open",
                ...(takeProfit ? { take_profit: parseFloat(takeProfit) } : {}),
                ...(stopLoss ? { stop_loss: parseFloat(stopLoss) } : {}),
                ...(isClosedPosition && exitPrice
                    ? { exit_price: parseFloat(exitPrice), exit_time: new Date().toISOString() }
                    : {}),
            };

            await onCreatePosition(user._id, positionPayload);
            resetForm();
            onOpenChange(false);
        } catch (error) {
            console.error("Création de position échouée:", error);
            alert("Impossible de créer la position");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedPair("");
        setManualSymbol("");
        setDropdownOpen(false);
        setSearchQuery("");
        setType("buy");
        setBaseCurrency("USDT");
        setEntryPrice("");
        setQuantity("");
        setAmount("");
        setLeverage(1);
        setTakeProfit("");
        setStopLoss("");
        setIsClosedPosition(false);
        setExitPrice("");
    };

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    // Check if form has validation errors
    const isConfirmDisabled =
        isSubmitting ||
        (!selectedPair && !manualSymbol) ||
        !amount ||
        !quantity ||
        (!isClosedPosition && amountNum > userBalance) ||
        (isClosedPosition && (!exitPrice || parseFloat(exitPrice) <= 0)) ||
        leverageMismatch;

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Créer une position</DialogTitle>
                    <DialogDescription>
                        Créer une nouvelle position pour {user.first_name} {user.last_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        {/* Current Balance */}
                        <div className="rounded-md border p-3 bg-muted/50">
                            <p className="text-sm">
                                Solde {baseCurrency}:{" "}
                                <span className="font-medium">{formatAmountByCurrency(userBalance, baseCurrency)}</span>
                            </p>
                        </div>

                        {/* Type & Base Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={(v) => setType(v as "buy" | "sell")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="buy">Achat (Long)</SelectItem>
                                        <SelectItem value="sell">Vente (Short)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="baseCurrency">Monnaie de base</Label>
                                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USDT">USDT</SelectItem>
                                        <SelectItem value="BTC">BTC</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Pair Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="pair">Symbole depuis le chart</Label>
                                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between"
                                            disabled={!!manualSymbol}
                                        >
                                            <span className="truncate">
                                                {selectedPair
                                                    ? (() => {
                                                          const pair = pairs.find((p) => p.pair === selectedPair);
                                                          if (!pair) return "Sélectionner";
                                                          return `${pair.name || pair.pair}`;
                                                      })()
                                                    : "Sélectionner"}
                                            </span>
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[400px] p-0">
                                        <div className="p-2 border-b border-border sticky top-0 bg-background">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Rechercher..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ maxHeight: "300px", overflow: "auto" }}>
                                            {filteredPairs.length > 0 ? (
                                                filteredPairs.map((pair) => (
                                                    <button
                                                        key={pair.pair}
                                                        onClick={() => {
                                                            setSelectedPair(pair.pair);
                                                            setSearchQuery("");
                                                            setDropdownOpen(false);
                                                        }}
                                                        className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 text-left transition"
                                                    >
                                                        <PairItem pair={pair} isSelected={selectedPair === pair.pair} />
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    Aucune paire trouvée
                                                </div>
                                            )}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="manualSymbol">Ou entrez une autre paire</Label>
                                    {selectedPair && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedPair("")}
                                            className="h-auto py-1 px-2 text-xs"
                                        >
                                            Réinitialiser
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    id="manualSymbol"
                                    placeholder="e.g., SOLUSDT"
                                    value={manualSymbol}
                                    onChange={(e) => {
                                        setManualSymbol(e.target.value);
                                        if (e.target.value) setSelectedPair("");
                                    }}
                                    disabled={!!selectedPair}
                                />
                            </div>
                        </div>

                        {/* Entry Price with Current Price Button */}
                        <div className="grid gap-2">
                            <Label htmlFor="entryPrice">Prix d'entrée ({baseCurrency})</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="entryPrice"
                                    type="text"
                                    placeholder="Prix d'entrée"
                                    value={entryPrice}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                            setEntryPrice(value);
                                        }
                                    }}
                                    required
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleSetCurrentPrice}
                                    disabled={!selectedPair}
                                >
                                    Prix actuel
                                </Button>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity">Quantité</Label>
                            <Input
                                id="quantity"
                                type="text"
                                placeholder="Quantité"
                                value={quantity}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                        // Clean input to enforce max decimals
                                        setQuantity(cleanQuantityInput(value));
                                    }
                                }}
                                required
                            />
                        </div>

                        {/* Amount with Slider */}
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant investi ({baseCurrency})</Label>
                            <Input
                                id="amount"
                                type="text"
                                placeholder={baseCurrency === "BTC" ? "0.00000" : "0.00"}
                                value={amount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                        // Clean input to enforce max decimals based on currency
                                        setAmount(cleanAmountInput(value, baseCurrency));
                                    }
                                }}
                                required
                                className={amountNum > userBalance ? "border-red-500" : ""}
                            />
                            {amountNum > userBalance && (
                                <p className="text-xs text-red-500">
                                    Le montant dépasse le solde disponible (
                                    {formatAmountByCurrency(userBalance, baseCurrency)} {baseCurrency})
                                </p>
                            )}
                            <Slider
                                value={[amountNum]}
                                onValueChange={([value]) => {
                                    // Format with exact decimals for the currency (no locale formatting)
                                    setAmount(formatAmountForInput(value, baseCurrency));
                                }}
                                min={0}
                                max={userBalance}
                                step={getAmountStep(baseCurrency)}
                                className="w-full"
                            />
                        </div>

                        {/* Leverage with Slider */}
                        <div className="grid gap-2">
                            <Label>Levier: x{leverage}</Label>
                            <Slider
                                value={[leverage]}
                                onValueChange={([value]) => setLeverage(value)}
                                min={1}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>1x</span>
                                <span>20x</span>
                                <span>50x</span>
                                <span>80x</span>
                                <span>100x</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Un levier plus élevé signifie un risque plus élevé et une liquidation potentielle
                            </p>
                        </div>

                        {/* Calculated Values */}
                        <div className="rounded-md border p-3 space-y-1 text-xs text-muted-foreground">
                            <p>
                                Taille de position:{" "}
                                <span className="font-medium text-foreground">
                                    {formatAmountByCurrency(positionSize, baseCurrency)}
                                </span>{" "}
                                {baseCurrency}
                            </p>
                            <p>
                                Prix de liquidation:{" "}
                                <span className="font-medium text-foreground">{liquidationPrice.toFixed(8)}</span>{" "}
                                {baseCurrency}
                            </p>
                        </div>

                        {/* Take Profit & Stop Loss */}
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="takeProfit">Take Profit (optionnel)</Label>
                                <Input
                                    id="takeProfit"
                                    type="text"
                                    placeholder="Prix de prise de profit"
                                    value={takeProfit}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                            setTakeProfit(value);
                                        }
                                    }}
                                />
                                {takeProfit && (
                                    <p
                                        className={`text-xs ${
                                            parseFloat(calculatePotentialPnl(parseFloat(takeProfit)) || "0") >= 0
                                                ? "text-green-500"
                                                : "text-red-500"
                                        }`}
                                    >
                                        PnL potentiel: {calculatePotentialPnl(parseFloat(takeProfit))} {baseCurrency}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="stopLoss">Stop Loss (optionnel)</Label>
                                <Input
                                    id="stopLoss"
                                    type="text"
                                    placeholder="Prix de stop loss"
                                    value={stopLoss}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                            setStopLoss(value);
                                        }
                                    }}
                                />
                                {stopLoss && (
                                    <p
                                        className={`text-xs ${
                                            parseFloat(calculatePotentialPnl(parseFloat(stopLoss)) || "0") >= 0
                                                ? "text-green-500"
                                                : "text-red-500"
                                        }`}
                                    >
                                        Perte potentielle: {calculatePotentialPnl(parseFloat(stopLoss))} {baseCurrency}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Closed Position Checkbox */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="closedPosition"
                                checked={isClosedPosition}
                                onCheckedChange={(checked) => setIsClosedPosition(checked as boolean)}
                            />
                            <Label htmlFor="closedPosition" className="cursor-pointer">
                                Position clôturée
                            </Label>
                        </div>

                        {/* Exit Price and PNL for Closed Positions */}
                        {isClosedPosition && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="exitPrice">Prix de clôture ({baseCurrency})</Label>
                                    <Input
                                        id="exitPrice"
                                        type="text"
                                        placeholder="Prix de clôture"
                                        value={exitPrice}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                setExitPrice(value);
                                            }
                                        }}
                                        required
                                    />
                                </div>

                                {exitPrice && (
                                    <div className="rounded-md border p-3">
                                        <p className="text-sm">
                                            PNL:{" "}
                                            <span
                                                className={`font-medium ${
                                                    calculatePNL() > 0
                                                        ? "text-green-500"
                                                        : calculatePNL() < 0
                                                        ? "text-red-500"
                                                        : "text-muted-foreground"
                                                }`}
                                            >
                                                {formatAmountByCurrency(calculatePNL(), baseCurrency)} {baseCurrency}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Leverage Mismatch Warning */}
                        {leverageMismatch && existingPosition && (
                            <Alert className="bg-yellow-500/10 border-yellow-500/50">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <AlertDescription className="text-yellow-500 text-xs">
                                    L'utilisateur a une position ouverte pour{" "}
                                    {selectedPair || (manualSymbol ? `${manualSymbol}${baseCurrency}` : "")} avec un
                                    levier de {existingPosition.leverage}x. Veuillez utiliser le même levier (
                                    {existingPosition.leverage}x) pour créer une nouvelle position.
                                </AlertDescription>
                            </Alert>
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
                        <Button type="submit" disabled={isConfirmDisabled}>
                            {isSubmitting ? "Création..." : "Créer la position"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
