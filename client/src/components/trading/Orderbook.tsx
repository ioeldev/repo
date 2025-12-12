import { useState, useEffect, useId, useRef } from "react";
import { useTradingContext } from "@/contexts/TradingContext";
import { useBinanceWebSocket } from "@/contexts/BinanceWebSocketContext";

interface OrderbookData {
    bids: Array<[string, string]>;
    asks: Array<[string, string]>;
    lastUpdateId: number;
}

// Partial Book Depth payload (from @depth10@1000ms stream)
interface PartialDepthPayload {
    lastUpdateId: number;
    bids: Array<[string, string]>;
    asks: Array<[string, string]>;
}

export function Orderbook() {
    const componentId = useId();
    const { selectedPair } = useTradingContext();
    const { subscribe, unsubscribe, addMessageHandler, removeMessageHandler } = useBinanceWebSocket();

    const [orderbookData, setOrderbookData] = useState<OrderbookData>({
        bids: [],
        asks: [],
        lastUpdateId: 0,
    });

    const currentSubscriptionRef = useRef<string | null>(null);
    const prevPairRef = useRef<string | null>(null);

    // Register message handler for partial depth updates
    useEffect(() => {
        const handleMessage = (data: any) => {
            // Partial Book Depth payload has lastUpdateId, bids, asks (no "e" event type)
            // It's the full top 10 levels, sent every 1000ms
            if (data.lastUpdateId && data.bids && data.asks && !data.e) {
                // Only update if we have an active subscription
                if (!currentSubscriptionRef.current) return;

                const payload = data as PartialDepthPayload;

                setOrderbookData({
                    bids: payload.bids.slice(0, 10),
                    asks: payload.asks.slice(0, 10),
                    lastUpdateId: payload.lastUpdateId,
                });
            }
        };

        addMessageHandler(componentId, handleMessage);

        return () => {
            removeMessageHandler(componentId);
        };
    }, [componentId, addMessageHandler, removeMessageHandler]);

    // Subscribe to orderbook when pair changes
    useEffect(() => {
        if (!selectedPair?.pair) {
            return;
        }

        const pair = selectedPair.pair;

        // Skip if pair hasn't actually changed
        if (prevPairRef.current === pair) {
            return;
        }

        // Unsubscribe from previous pair if exists
        if (prevPairRef.current && currentSubscriptionRef.current === prevPairRef.current) {
            console.log(`[Orderbook] Unsubscribing from ${prevPairRef.current}`);
            unsubscribe([prevPairRef.current], "orderbook");
            currentSubscriptionRef.current = null;
            // Clear orderbook immediately on switch
            setOrderbookData({ bids: [], asks: [], lastUpdateId: 0 });
        }

        prevPairRef.current = pair;
        currentSubscriptionRef.current = pair;
        console.log(`[Orderbook] Subscribing to ${pair}`);
        subscribe([pair], "orderbook");

        return () => {
            // Only unsubscribe if we're still subscribed to this pair
            if (currentSubscriptionRef.current === pair) {
                console.log(`[Orderbook] Cleaning up ${pair} on unmount`);
                currentSubscriptionRef.current = null;
                prevPairRef.current = null;
                unsubscribe([pair], "orderbook");
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPair?.pair]);

    const formatPrice = (price: string | number): string => {
        const num = typeof price === "string" ? parseFloat(price) : price;
        if (num >= 1000) {
            return num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }
        return num.toFixed(2);
    };

    const formatAmount = (amount: string | number): string => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (num >= 1000) {
            return num.toFixed(3);
        }
        if (num >= 1) {
            return num.toFixed(4);
        }
        return num.toFixed(6);
    };

    const formatTotal = (total: number): string => {
        if (total >= 1000000) {
            return `${(total / 1000000).toFixed(2)}M`;
        }
        if (total >= 1000) {
            return `${(total / 1000).toFixed(2)}K`;
        }
        return total.toFixed(2);
    };

    // Get orderbook levels
    const depthLevels = 10;
    const topAsks = orderbookData.asks.slice(0, depthLevels).reverse();
    const topBids = orderbookData.bids.slice(0, depthLevels);

    // Calculate cumulative totals
    const asksWithTotal = topAsks.map((ask, idx) => {
        const total = topAsks.slice(idx).reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        return { price: ask[0], qty: ask[1], total };
    });

    const bidsWithTotal = topBids.map((bid, idx) => {
        const total = topBids
            .slice(0, idx + 1)
            .reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
        return { price: bid[0], qty: bid[1], total };
    });

    const bestBid = parseFloat(orderbookData.bids[0]?.[0] || "0");

    // Show loading state only if we have a subscription but no data yet
    const isLoading = currentSubscriptionRef.current && orderbookData.lastUpdateId === 0;

    if (isLoading) {
        return (
            <div className="flex-1 lg:flex-1 w-2/5 lg:w-auto space-y-2 p-3 overflow-hidden flex flex-col bg-card border-r border-border lg:border-r items-center justify-center">
                <p className="text-xs text-muted-foreground">Loading orderbook...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 lg:flex-1 w-full lg:w-auto space-y-2 p-3 overflow-hidden flex flex-col bg-card border-r border-border">
            {/* Header */}
            <div className="space-y-2">
                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-2 text-[9px] lg:text-[10px] text-muted-foreground font-medium px-1">
                    <div className="text-left">Price (USDT)</div>
                    <div className="text-right">Amount (BTC)</div>
                    <div className="text-right">Total (USDT)</div>
                </div>
            </div>

            {/* Orders Container */}
            <div className="flex-1 overflow-y-auto">
                {/* Sell Orders (Red/Asks) */}
                <div className="space-y-0.5">
                    {asksWithTotal.map(({ price, qty, total }, idx) => (
                        <div
                            key={`ask-${idx}`}
                            className="grid grid-cols-3 gap-2 py-0.5 px-1 text-[10px] lg:text-xs hover:bg-red-500/10 transition-colors"
                        >
                            <span className="text-red-500 font-medium">{formatPrice(price)}</span>
                            <span className="text-right text-foreground">{formatAmount(qty)}</span>
                            <span className="text-right text-muted-foreground">{formatTotal(total)}</span>
                        </div>
                    ))}
                </div>

                {/* Spread */}
                <div className="py-2 my-1 border-y border-muted text-center">
                    <div className="text-foreground font-bold text-sm lg:text-base">{formatPrice(bestBid)}</div>
                </div>

                {/* Buy Orders (Green/Bids) */}
                <div className="space-y-0.5">
                    {bidsWithTotal.map(({ price, qty, total }, idx) => (
                        <div
                            key={`bid-${idx}`}
                            className="grid grid-cols-3 gap-2 py-0.5 px-1 text-[10px] lg:text-xs hover:bg-green-500/10 transition-colors"
                        >
                            <span className="text-green-500 font-medium">{formatPrice(price)}</span>
                            <span className="text-right text-foreground">{formatAmount(qty)}</span>
                            <span className="text-right text-muted-foreground">{formatTotal(total)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
