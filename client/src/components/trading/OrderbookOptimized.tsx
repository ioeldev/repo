import { useState, useEffect, useId, useRef, useCallback, useMemo } from "react";
import { useTradingContext } from "@/contexts/TradingContext";
import { useBinanceWebSocket } from "@/contexts/BinanceWebSocketContext";

interface OrderbookData {
    bids: Array<[string, string]>;
    asks: Array<[string, string]>;
    lastUpdateId: number;
}

interface DepthUpdateEvent {
    e: string; // Event type
    E: number; // Event time
    s: string; // Symbol
    U: number; // First update ID in event
    u: number; // Final update ID in event
    b: Array<[string, string]>; // Bids to be updated
    a: Array<[string, string]>; // Asks to be updated
}

// Throttle hook for limiting updates
function useThrottle<T>(value: T, delay: number): T {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastUpdate = useRef(Date.now());
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingValue = useRef<T>(value);

    useEffect(() => {
        pendingValue.current = value;
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdate.current;

        if (timeSinceLastUpdate >= delay) {
            // Enough time has passed, update immediately
            lastUpdate.current = now;
            setThrottledValue(value);
        } else {
            // Schedule update for later
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                lastUpdate.current = Date.now();
                setThrottledValue(pendingValue.current);
                timeoutRef.current = null;
            }, delay - timeSinceLastUpdate);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);

    return throttledValue;
}

export function OrderbookOptimized() {
    const componentId = useId();
    const { selectedPair } = useTradingContext();
    const { subscribe, unsubscribe, addMessageHandler, removeMessageHandler } = useBinanceWebSocket();

    const [orderbookData, setOrderbookData] = useState<OrderbookData>({
        bids: [],
        asks: [],
        lastUpdateId: 0,
    });

    const orderbookRef = useRef<OrderbookData>({ bids: [], asks: [], lastUpdateId: 0 });
    const eventBufferRef = useRef<DepthUpdateEvent[]>([]);
    const isInitializedRef = useRef(false);
    const currentSubscriptionRef = useRef<string | null>(null);
    const updateCounterRef = useRef(0);

    // Apply incremental updates to orderbook
    const applyUpdate = useCallback((event: DepthUpdateEvent) => {
        const currentUpdateId = orderbookRef.current.lastUpdateId;

        // If event u < local update ID, ignore the event
        if (event.u <= currentUpdateId) {
            return;
        }

        // Apply updates to price levels
        const updateLevels = (
            levels: Array<[string, string]>,
            updates: Array<[string, string]>,
            isBid: boolean
        ): Array<[string, string]> => {
            const levelMap = new Map(levels.map((l) => [l[0], l[1]]));

            updates.forEach(([price, qty]) => {
                if (parseFloat(qty) === 0) {
                    levelMap.delete(price);
                } else {
                    levelMap.set(price, qty);
                }
            });

            // Sort: bids descending, asks ascending
            return Array.from(levelMap.entries())
                .sort((a, b) => (isBid ? parseFloat(b[0]) - parseFloat(a[0]) : parseFloat(a[0]) - parseFloat(b[0])))
                .slice(0, 20); // Keep top 20 levels
        };

        const updatedBids = updateLevels(orderbookRef.current.bids, event.b, true);
        const updatedAsks = updateLevels(orderbookRef.current.asks, event.a, false);

        const updated = {
            bids: updatedBids,
            asks: updatedAsks,
            lastUpdateId: event.u,
        };

        orderbookRef.current = updated;

        // Increment update counter to trigger throttled update
        updateCounterRef.current++;
        setOrderbookData(updated);
    }, []);

    // Initialize orderbook
    const initializeOrderbook = useCallback(
        async (symbol: string) => {
            // Avoid duplicate subscriptions
            if (currentSubscriptionRef.current === symbol) {
                console.log(`[Orderbook] Already subscribed to ${symbol}, skipping`);
                return;
            }

            // Reset state
            isInitializedRef.current = false;
            eventBufferRef.current = [];

            // Update current subscription
            currentSubscriptionRef.current = symbol;

            // Subscribe to WebSocket (events will be buffered)
            subscribe([symbol], "orderbook");

            // Clear buffer and mark as initialized
            eventBufferRef.current = [];
            isInitializedRef.current = true;
        },
        [subscribe]
    );

    // Register message handler
    useEffect(() => {
        const handleMessage = (data: any) => {
            // Handle orderbook depth update from Binance
            if (data.e === "depthUpdate" && data.s === selectedPair?.pair) {
                const event: DepthUpdateEvent = {
                    e: data.e,
                    E: data.E,
                    s: data.s,
                    U: data.U,
                    u: data.u,
                    b: data.b || [],
                    a: data.a || [],
                };

                // Buffer events until initialized, then apply them
                if (!isInitializedRef.current) {
                    eventBufferRef.current.push(event);
                } else {
                    applyUpdate(event);
                }
            }
        };

        addMessageHandler(componentId, handleMessage);

        return () => {
            removeMessageHandler(componentId);
        };
    }, [componentId, selectedPair?.pair, addMessageHandler, removeMessageHandler, applyUpdate]);

    // Track the previous pair to detect actual changes
    const prevPairRef = useRef<string | null>(null);

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
            console.log(`[Orderbook] Cleaning up ${prevPairRef.current} orderbook`);
            unsubscribe([prevPairRef.current], "orderbook");
            isInitializedRef.current = false;
            eventBufferRef.current = [];
            orderbookRef.current = { bids: [], asks: [], lastUpdateId: 0 };
            setOrderbookData({ bids: [], asks: [], lastUpdateId: 0 });
            currentSubscriptionRef.current = null;
        }

        prevPairRef.current = pair;
        console.log(`[Orderbook] Setting up orderbook for ${pair}`);
        initializeOrderbook(pair);

        return () => {
            // Only unsubscribe if we're actually subscribed to this pair
            if (currentSubscriptionRef.current === pair) {
                console.log(`[Orderbook] Cleaning up ${pair} orderbook on unmount`);
                isInitializedRef.current = false;
                eventBufferRef.current = [];
                orderbookRef.current = { bids: [], asks: [], lastUpdateId: 0 };
                setOrderbookData({ bids: [], asks: [], lastUpdateId: 0 });
                currentSubscriptionRef.current = null;
                prevPairRef.current = null;
                unsubscribe([pair], "orderbook");
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPair?.pair]); // Only depend on the pair value, not the functions

    // Throttle the orderbook data to reduce render frequency (100ms = 10 updates per second max)
    const throttledOrderbookData = useThrottle(orderbookData, 100);

    // Memoize formatting functions
    const formatPrice = useCallback((price: string | number): string => {
        const num = typeof price === "string" ? parseFloat(price) : price;
        if (num >= 1000) {
            return num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }
        return num.toFixed(2);
    }, []);

    const formatAmount = useCallback((amount: string | number): string => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (num >= 1000) {
            return num.toFixed(3);
        }
        if (num >= 1) {
            return num.toFixed(4);
        }
        return num.toFixed(6);
    }, []);

    const formatTotal = useCallback((total: number): string => {
        if (total >= 1000000) {
            return `${(total / 1000000).toFixed(2)}M`;
        }
        if (total >= 1000) {
            return `${(total / 1000).toFixed(2)}K`;
        }
        return total.toFixed(2);
    }, []);

    // Memoize orderbook levels calculation
    const { topAsks, topBids, bestBid } = useMemo(() => {
        const depthLevels = 10;
        const asks = throttledOrderbookData.asks.slice(0, depthLevels).reverse();
        const bids = throttledOrderbookData.bids.slice(0, depthLevels);
        const bid = parseFloat(throttledOrderbookData.bids[0]?.[0] || "0");

        return { topAsks: asks, topBids: bids, bestBid: bid };
    }, [throttledOrderbookData]);

    // Calculate cumulative totals
    const asksWithTotal = useMemo(
        () =>
            topAsks.map((ask, idx) => {
                const total = topAsks
                    .slice(idx)
                    .reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
                return { price: ask[0], qty: ask[1], total };
            }),
        [topAsks]
    );

    const bidsWithTotal = useMemo(
        () =>
            topBids.map((bid, idx) => {
                const total = topBids
                    .slice(0, idx + 1)
                    .reduce((sum, [price, qty]) => sum + parseFloat(price) * parseFloat(qty), 0);
                return { price: bid[0], qty: bid[1], total };
            }),
        [topBids]
    );

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
                            key={`ask-${idx}-${price}`}
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
                            key={`bid-${idx}-${price}`}
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
